// The limits every Gemini HTTP call must pass: time left, the request's own budget of calls, the daily cap, and
// a short rest for a model that answered with a quota error, so a spent quota costs one call a minute per model.
import type { Clock } from '../lib/clock.js';
import type { CallBudget } from '../lib/model.js';
import type { RateLimiter } from '../lib/rate-limit.js';
import { MAX_TOOL_ROUNDS, miss, type Miss } from './gemini-request.js';

/** After a quota answer, a model is not asked again for this long. */
export const QUOTA_PAUSE_MS = 60_000;

/** When each model that answered with a quota error may be asked again, in epoch ms. */
export type QuotaPauses = Map<string, number>;

/** What a call is checked against before it goes out. */
export interface CallLimits {
  readonly deadline: number;
  readonly clock: Clock;
  readonly callCap: RateLimiter;
  readonly budget: CallBudget | undefined;
}

/** Why a call may not go ahead: no time left, the request's budget spent or refused, or the daily cap reached. */
export async function blocked(limits: CallLimits): Promise<Miss | null> {
  if (limits.deadline - limits.clock.now() <= 0) {
    return miss('timeout');
  }
  if (limits.budget && !(await limits.budget.take())) {
    return miss('rate_limited');
  }
  return (await limits.callCap.take('model-calls')).allowed ? null : miss('daily_cap');
}

/** The round that may not call tools: the last allowed round, or the one that spent the request's last call. */
export function lastRound(budget: CallBudget | undefined, round: number): boolean {
  return round === MAX_TOOL_ROUNDS || budget?.left() === 0;
}

/** True while a model is resting after a quota answer. */
export function resting(pauses: QuotaPauses, model: string, now: number): boolean {
  return (pauses.get(model) ?? 0) > now;
}

/** Rests a model that answered with a quota error, from now; any other failure changes nothing. */
export function noteFailure(
  pauses: QuotaPauses,
  failure: { model: string; kind: string; now: number },
): void {
  if (failure.kind === 'quota') {
    pauses.set(failure.model, failure.now + QUOTA_PAUSE_MS);
  }
}
