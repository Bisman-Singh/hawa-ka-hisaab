// Tests for the limits on each Gemini call: time, the request budget, the daily cap, the last round and the rest
// after a quota error.
import { describe, expect, it } from 'vitest';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import {
  blocked,
  lastRound,
  noteFailure,
  QUOTA_PAUSE_MS,
  resting,
  type QuotaPauses,
} from '../../src/server/gemini-limits.js';
import { MAX_TOOL_ROUNDS } from '../../src/server/gemini-request.js';
import { createFakeClock } from '../support/fake-clock.js';

const clock = createFakeClock();
const cap = (limit: number) => createFixedWindowLimiter({ limit, windowMs: 1000, maxKeys: 1, clock });
const spent = { take: () => Promise.resolve(false), left: () => 0 };
const open = { take: () => Promise.resolve(true), left: () => 2 };

describe('blocked', () => {
  it('stops a call with no time left, a spent budget or a reached cap, and lets one through otherwise', async () => {
    const at = clock.now();
    expect(await blocked({ deadline: at, clock, callCap: cap(1), budget: open })).toMatchObject({
      kind: 'timeout',
    });
    expect(await blocked({ deadline: at + 1000, clock, callCap: cap(1), budget: spent })).toMatchObject({
      kind: 'rate_limited',
    });
    expect(await blocked({ deadline: at + 1000, clock, callCap: cap(0), budget: undefined })).toMatchObject({
      kind: 'daily_cap',
    });
    expect(await blocked({ deadline: at + 1000, clock, callCap: cap(1), budget: open })).toBeNull();
  });
});

describe('lastRound', () => {
  it('is the last tool round or the round that spent the budget', () => {
    expect(lastRound(undefined, MAX_TOOL_ROUNDS)).toBe(true);
    expect(lastRound(spent, 0)).toBe(true);
    expect(lastRound(open, 0)).toBe(false);
  });
});

describe('quota rest', () => {
  it('rests a model for QUOTA_PAUSE_MS after a quota error and not after other failures', () => {
    const pauses: QuotaPauses = new Map();
    noteFailure(pauses, { model: 'a', kind: 'timeout', now: 0 });
    expect(resting(pauses, 'a', 1)).toBe(false);
    noteFailure(pauses, { model: 'a', kind: 'quota', now: 0 });
    expect(resting(pauses, 'a', QUOTA_PAUSE_MS - 1)).toBe(true);
    expect(resting(pauses, 'a', QUOTA_PAUSE_MS)).toBe(false);
  });
});
