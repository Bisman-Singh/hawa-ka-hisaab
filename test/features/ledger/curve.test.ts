// Tests for reading the forecast curve by IST hour and averaging it over a span of minutes.
import { describe, expect, it } from 'vitest';
import type { HourlyAir } from '../../../src/features/air/types.js';
import { dayCurve, meanPm25 } from '../../../src/features/ledger/curve.js';
import { hourCurve } from '../../support/fake-air.js';

function row(time: string, pm25: number | null): HourlyAir {
  return { time, pm25, pm10: null, no2: null, so2: null, o3: null, co: null };
}

describe('dayCurve', () => {
  it('keys hours after midnight IST, whether times carry Z or +05:30', () => {
    const fromUtc = dayCurve(hourCurve([10, 20, 30]), '2026-11-24');
    expect([...fromUtc.entries()]).toEqual([
      [0, 10],
      [1, 20],
      [2, 30],
    ]);
    const local = { ...hourCurve([]), hours: [row('2026-11-24T13:00:00+05:30', 80)] };
    expect(dayCurve(local, '2026-11-24').get(13)).toBe(80);
  });

  it('leaves out hours without PM2.5 or off the hour, and is empty with no curve', () => {
    const rows = [row('2026-11-24T00:00:00+05:30', null), row('2026-11-24T00:30:00+05:30', 20)];
    expect(dayCurve({ ...hourCurve([]), hours: rows }, '2026-11-24').size).toBe(0);
    expect(dayCurve(null, '2026-11-24').size).toBe(0);
  });
});

describe('meanPm25', () => {
  it('weights each hour by the minutes spent in it', () => {
    const day = dayCurve(hourCurve([100, 200, 300]), '2026-11-24');
    expect(meanPm25(day, 0, 60)).toBe(100);
    expect(meanPm25(day, 30, 60)).toBe(150);
    expect(meanPm25(day, 30, 120)).toBe(200);
  });

  it('is null when an hour is missing or the span is empty', () => {
    const day = dayCurve(hourCurve([100]), '2026-11-24');
    expect(meanPm25(day, 30, 60)).toBeNull();
    expect(meanPm25(day, 0, 0)).toBeNull();
  });
});
