// What a failed upstream read means: the words the screen chooses from and how long before the upstream is asked
// again. One table, so the reason shown and the wait behind it never disagree.
import type { FeedFailure, FeedProblem } from './types.js';

const MINUTE = 60_000;

/** The short wait, for failures a moment can fix: a rebuild in progress, a dropped connection, a gateway error. */
export const SHORT_RETRY_MS = 20_000;

type Outcome = readonly [problem: FeedProblem, retryMs: number];

// A minute when the upstream asked to slow down or took the whole time, ten minutes when it refused the request
// itself or sent far too much, and no wait for a call that was never made, so it is not held against the next reader.
const BY_KIND: Readonly<Record<Exclude<FeedFailure['kind'], 'status'>, Outcome>> = {
  incomplete: ['updating', SHORT_RETRY_MS],
  network: ['no_answer', SHORT_RETRY_MS],
  timeout: ['no_answer', MINUTE],
  invalid_body: ['unusable', MINUTE],
  too_large: ['unusable', 10 * MINUTE],
  over_budget: ['busy', 0],
};

function outcomeOf(failure: FeedFailure): Outcome {
  if (failure.kind !== 'status') {
    return BY_KIND[failure.kind];
  }
  if (failure.status === 429) {
    return ['busy', MINUTE];
  }
  return failure.status >= 500 ? ['no_answer', SHORT_RETRY_MS] : ['unusable', 10 * MINUTE];
}

/** What the screen can say about a failed read. */
export function feedProblem(failure: FeedFailure): FeedProblem {
  return outcomeOf(failure)[0];
}

/** The wait before asking an upstream again after a failure. */
export function retryAfterMs(failure: FeedFailure): number {
  return outcomeOf(failure)[1];
}
