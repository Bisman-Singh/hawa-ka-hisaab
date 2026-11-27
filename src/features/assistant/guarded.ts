// Runs one model task inside the guards: the short cache, the time left, the per-client limit, the schema, prose
// checks, the number guard and one retry on a failed check. It always returns a complete trace.
import { MIN_MODEL_CALL_MS, MIN_RETRY_MS } from '../../config/limits.js';
import type { Clock } from '../../lib/clock.js';
import type { CallBudget, ModelPort, ModelRequest } from '../../lib/model.js';
import { callBudget } from './call-budget.js';
import type { RateDecision } from '../../lib/rate-limit.js';
import type { FallbackReason, ModelFailureKind, NumberCheck, Trace } from '../../lib/types.js';
import { attempt, type Attempt, type GuardedTask, type Rejected } from './attempt.js';
import { checkOf, traceOf } from './guard-trace.js';
import { retryInstructions } from './instructions.js';
import type { ReplyCache } from './reply-cache.js';

/** A task for the guards, defined with the single attempt that runs it. */
export type { GuardedTask } from './attempt.js';

/** A checked model reply, or the reason the caller must use its rules path. Both carry the trace. */
export type Guarded<T> =
  | { readonly kind: 'checked'; readonly value: T; readonly trace: Trace }
  | { readonly kind: 'fallback'; readonly reason: FallbackReason; readonly trace: Trace };

/** A checked reply, the only kind the short cache keeps. */
export type Checked<T> = Extract<Guarded<T>, { kind: 'checked' }>;

/**
 * What a route hands a model task. allow takes one unit of the per-client limit and is called before every model
 * HTTP call, never for a cached reply. cache holds checked replies to identical requests and inFlight the ones
 * still being worked out, both shared by every request to the route. deadline is in epoch ms.
 */
export interface ModelRun<T> {
  readonly model: ModelPort;
  readonly allow: () => Promise<RateDecision>;
  readonly cache: ReplyCache<Checked<T>>;
  readonly inFlight: Map<string, Promise<Guarded<T>>>;
  readonly clock: Clock;
  readonly deadline: number;
}

interface History {
  readonly earlier: Rejected | null;
  readonly attempts: number;
}

function reasonOf<T>(outcome: Exclude<Attempt<T>, { kind: 'checked' }>): FallbackReason {
  if (outcome.kind === 'failed') {
    return outcome.failure;
  }
  return outcome.problem === 'numbers' ? 'number_check_failed' : 'invalid_reply';
}

function settle<T>(request: ModelRequest<T>, outcome: Attempt<T>, history: History): Guarded<T> {
  if (outcome.kind === 'checked') {
    const check: NumberCheck = { status: 'passed', attempts: history.attempts, unmatched: [] };
    const trace = traceOf(request.facts, { reason: null, reply: outcome.reply, check });
    return { kind: 'checked', value: outcome.reply.value, trace };
  }
  const rejected = outcome.kind === 'rejected' ? outcome : history.earlier;
  const reason = reasonOf(outcome);
  const check = checkOf(rejected?.numbers ?? null, history.attempts);
  const refused = rejected ? { problem: rejected.problem, reply: rejected.reply } : null;
  return { kind: 'fallback', reason, trace: traceOf(request.facts, { reason, reply: null, check, refused }) };
}

/** A retry is worth a call only for a reply that came back with text a check refused, with time and calls left. */
function retryable(run: ModelRun<unknown>, first: Attempt<unknown>, budget: CallBudget): first is Rejected {
  const timeLeft = run.deadline - run.clock.now() >= MIN_RETRY_MS;
  return first.kind === 'rejected' && first.reply !== null && timeLeft && budget.left() > 0;
}

const keyOf = (request: ModelRequest<unknown>): string =>
  JSON.stringify([
    request.task,
    request.instructions,
    request.data,
    request.facts,
    request.tools.map((tool) => tool.name),
  ]);

const failedBefore = <T>(request: ModelRequest<T>, failure: ModelFailureKind): Guarded<T> =>
  settle(request, { kind: 'failed', failure }, { earlier: null, attempts: 0 });

async function ask<T>(run: ModelRun<T>, task: GuardedTask<T>, budget: CallBudget): Promise<Guarded<T>> {
  const request = { ...task.request, deadline: run.deadline, budget };
  const first = await attempt(run.model, task, request);
  if (!retryable(run, first, budget)) {
    return settle(task.request, first, { earlier: null, attempts: 1 });
  }
  const instructions = retryInstructions(task.request.instructions, first.problem);
  const second = await attempt(run.model, task, { ...request, instructions });
  return settle(task.request, second, { earlier: first, attempts: 2 });
}

async function guardedCall<T>(run: ModelRun<T>, task: GuardedTask<T>, key: string): Promise<Guarded<T>> {
  if (run.model.modelId === null) {
    return failedBefore(task.request, 'disabled');
  }
  if (run.deadline - run.clock.now() < MIN_MODEL_CALL_MS) {
    return failedBefore(task.request, 'timeout');
  }
  const budget = callBudget(run.allow);
  if (!(await budget.open())) {
    return failedBefore(task.request, 'rate_limited');
  }
  const result = await ask(run, task, budget);
  if (result.kind === 'checked') {
    run.cache.set(key, result);
  }
  return result;
}

const reused = <T>(result: Checked<T>): Guarded<T> => ({
  ...result,
  trace: { ...result.trace, cached: true },
});

/**
 * Runs a task. An identical request answered in the last few minutes is served from the cache, and one still in
 * flight shares that request's outcome, both with no model call and no unit of the limit; only a refusal by the
 * first caller's own limit is not shared. With no model configured it says so and takes no unit of the limit. Too
 * close to the deadline, or over the per-client limit, it never calls the model. A request makes at most
 * MAX_MODEL_CALLS_PER_REQUEST HTTP calls, each one a unit of the per-client limit. A reply whose text fails a check
 * is retried once with a fixed note on what failed, if time and calls are left; a reply with no text is not
 * retried. A second failure, or any model failure, becomes the labelled fallback, and the trace names the refusing
 * check but never carries the refused text.
 */
export async function runGuarded<T>(run: ModelRun<T>, task: GuardedTask<T>): Promise<Guarded<T>> {
  const key = keyOf(task.request);
  const hit = run.cache.get(key);
  if (hit) {
    return reused(hit);
  }
  const inFlight = run.inFlight.get(key);
  const shared = inFlight === undefined ? null : await inFlight;
  if (shared !== null && (shared.kind === 'checked' || shared.reason !== 'rate_limited')) {
    return shared.kind === 'checked' ? reused(shared) : shared;
  }
  const pending = guardedCall(run, task, key);
  run.inFlight.set(key, pending);
  try {
    return await pending;
  } finally {
    run.inFlight.delete(key);
  }
}
