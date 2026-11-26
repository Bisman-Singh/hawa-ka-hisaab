// A model run for pipeline tests: a fake clock, a fresh short cache, a far deadline and a limit decision the test
// chooses, with a count of how many units were taken.
import type { Checked, ModelRun } from '../../src/features/assistant/guarded.js';
import {
  createReplyCache,
  MODEL_CACHE_ENTRIES,
  MODEL_CACHE_TTL_MS,
} from '../../src/features/assistant/reply-cache.js';
import type { ModelPort } from '../../src/lib/model.js';
import type { RateDecision } from '../../src/lib/rate-limit.js';
import { createFakeClock, type FakeClock } from './fake-clock.js';

/** A unit of the per-client limit was granted. */
export const ALLOWED: RateDecision = { allowed: true, remaining: 5 };

/** The per-client limit is used up. */
export const LIMITED: RateDecision = { allowed: false, retryAfterSeconds: 20 };

/** Settings for a test run. leftMs is the time from the clock's now to the deadline. */
export interface TestRunOptions {
  readonly decision?: RateDecision;
  readonly clock?: FakeClock;
  readonly leftMs?: number;
}

/** A run over a model with its own cache. allowCalls counts the units taken. */
export function testRun<T>(
  model: ModelPort,
  options: TestRunOptions = {},
): ModelRun<T> & { readonly allowCalls: () => number } {
  const clock = options.clock ?? createFakeClock();
  let calls = 0;
  return {
    model,
    allow: () => {
      calls += 1;
      return Promise.resolve(options.decision ?? ALLOWED);
    },
    cache: createReplyCache<Checked<T>>({
      ttlMs: MODEL_CACHE_TTL_MS,
      maxEntries: MODEL_CACHE_ENTRIES,
      clock,
    }),
    clock,
    deadline: clock.now() + (options.leftMs ?? 60_000),
    allowCalls: () => calls,
  };
}
