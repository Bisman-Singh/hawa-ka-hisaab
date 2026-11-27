// Tests for judging a state's data.gov.in answer: refusals, whole and partial copies, what is kept and for how long.
import { describe, expect, it } from 'vitest';
import { COPY_TTL_MS, judgeStateAnswer, type StateCopy } from '../../../src/features/air/state-copy.js';
import type { StationRecord } from '../../../src/features/air/types.js';
import { jnuStation, rkPuramStation } from '../../support/fake-air.js';

const HOUR = 3_600_000;
const AT_22 = Date.parse('2026-11-24T22:00:00+05:30');
const at = (record: StationRecord, hour: string): StationRecord => ({ ...record, readingHour: hour });
const H21 = '2026-11-24T21:00:00+05:30';
const H22 = '2026-11-24T22:00:00+05:30';
const context = { indexed: 2, now: AT_22 };
const copyOf = (stations: StationRecord[], hour: string): StateCopy => ({
  feed: { provider: 'data_gov_in', feedHour: hour, stations },
  whole: true,
  ttlMs: COPY_TTL_MS.whole,
});

describe('judgeStateAnswer', () => {
  it('refuses an answer with no complete station, and one older than the copy held', () => {
    expect(judgeStateAnswer({ complete: [], incomplete: 3 }, undefined, context)).toEqual({
      ok: false,
      error: { kind: 'incomplete' },
    });
    const earlier = copyOf([jnuStation()], H22);
    const older = judgeStateAnswer({ complete: [at(jnuStation(), H21)], incomplete: 0 }, earlier, context);
    expect(older).toEqual({ ok: false, error: { kind: 'incomplete' } });
  });

  it('takes a whole answer of a recent hour for an hour, and one an hour behind for ten minutes', () => {
    const answer = { complete: [jnuStation(), rkPuramStation()], incomplete: 0 };
    expect(judgeStateAnswer(answer, undefined, context)).toMatchObject({
      ok: true,
      value: { whole: true, ttlMs: COPY_TTL_MS.whole },
    });
    expect(judgeStateAnswer(answer, undefined, { ...context, now: AT_22 + HOUR })).toMatchObject({
      value: { whole: true, ttlMs: COPY_TTL_MS.behind },
    });
  });

  it('marks an answer with a station short of rows, or under half the index, partial for twenty seconds', () => {
    const short = judgeStateAnswer({ complete: [jnuStation()], incomplete: 1 }, undefined, {
      ...context,
      indexed: 1,
    });
    expect(short).toMatchObject({ value: { whole: false, ttlMs: 20_000 } });
    const few = judgeStateAnswer({ complete: [jnuStation()], incomplete: 0 }, undefined, {
      ...context,
      indexed: 3,
    });
    expect(few).toMatchObject({ value: { whole: false } });
  });

  it('keeps a whole copy in use over an answer that is not whole, but lets a newer partial copy replace a partial one', () => {
    const whole = copyOf([at(rkPuramStation(), H21)], H21);
    const partial = { complete: [jnuStation()], incomplete: 1 };
    expect(judgeStateAnswer(partial, whole, context)).toEqual({ ok: false, error: { kind: 'incomplete' } });
    expect(judgeStateAnswer(partial, { ...whole, whole: false }, context)).toMatchObject({
      ok: true,
      value: { whole: false, feed: { feedHour: H22 } },
    });
  });
});
