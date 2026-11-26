// One call to the model and the checks on its reply: the schema, prose rules, task rules and the number guard.
import type { JsonValue } from '../../lib/json.js';
import type { ModelPort, ModelReply, ModelRequest } from '../../lib/model.js';
import type { ModelFailureKind } from '../../lib/types.js';
import type { Written } from './guard-trace.js';
import type { GuardProblem } from './instructions.js';
import { checkNumbers, collectAllowed, type NumberVerdict } from './number-guard.js';
import { proseProblem } from './text-guard.js';

/**
 * A task for the guards. sources lists data code sent whose numbers the reply may repeat, besides the facts and
 * tool results; user questions are left out of it. prose picks the reply's free text. check runs task rules.
 */
export interface GuardedTask<T> {
  readonly request: ModelRequest<T>;
  readonly sources: (value: T) => readonly JsonValue[];
  readonly prose: (value: T) => readonly string[];
  readonly check: (value: T) => GuardProblem | null;
}

/** A reply a check refused, with the problem, what was written and the number verdict if it got that far. */
export interface Rejected {
  readonly kind: 'rejected';
  readonly problem: GuardProblem;
  readonly reply: Written | null;
  readonly numbers: NumberVerdict | null;
}

/** What one call to the model came to. */
export type Attempt<T> =
  | { readonly kind: 'checked'; readonly reply: ModelReply<T> }
  | { readonly kind: 'failed'; readonly failure: ModelFailureKind }
  | Rejected;

function inspect<T>(task: GuardedTask<T>, reply: ModelReply<T>): Attempt<T> {
  if (!task.request.schema.safeParse(reply.value).success) {
    return { kind: 'rejected', problem: 'schema', reply, numbers: null };
  }
  const prose = task.prose(reply.value);
  const facts = task.request.facts.map((fact) => fact.value);
  const tools = reply.toolCalls.map((call) => call.result);
  const numbers = checkNumbers(prose, collectAllowed([...facts, ...task.sources(reply.value), ...tools]));
  const problem = proseProblem(prose) ?? task.check(reply.value) ?? (numbers.passed ? null : 'numbers');
  return problem === null ? { kind: 'checked', reply } : { kind: 'rejected', problem, reply, numbers };
}

/** Calls the model once and checks the reply, or reports the failure; a schema miss keeps the raw text. */
export async function attempt<T>(
  model: ModelPort,
  task: GuardedTask<T>,
  request: ModelRequest<T>,
): Promise<Attempt<T>> {
  const result = await model.generate(request);
  if (result.ok) {
    return inspect(task, result.value);
  }
  const { kind, reply } = result.error;
  if (kind !== 'invalid_reply') {
    return { kind: 'failed', failure: kind };
  }
  const written = reply ? { ...reply, toolCalls: [] } : null;
  return { kind: 'rejected', problem: 'schema', reply: written, numbers: null };
}
