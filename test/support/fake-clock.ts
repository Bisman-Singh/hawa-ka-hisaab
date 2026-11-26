// A clock that only moves when a test moves it.
import type { Clock } from '../../src/lib/clock.js';

/** A controllable clock. */
export interface FakeClock extends Clock {
  advance(ms: number): void;
  set(epochMs: number): void;
}

/** 24 Nov 2026 22:00 IST, the hour of the saved CPCB fixture. */
export const FIXTURE_HOUR_MS = Date.parse('2026-11-24T22:00:00+05:30');

/** Creates a fake clock starting at the given epoch milliseconds. */
export function createFakeClock(startMs: number = FIXTURE_HOUR_MS): FakeClock {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
    set: (epochMs) => {
      current = epochMs;
    },
  };
}
