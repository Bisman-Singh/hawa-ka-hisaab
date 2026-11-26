// Tests for the cleaner window and the place of each outdoor period in the forecast day.
import { describe, expect, it } from 'vitest';
import { analyseTiming } from '../../../src/features/community/timing.js';
import { dayCurve, fullSchool, fullSociety } from './support.js';

const DATE = '2026-11-26';

describe('analyseTiming', () => {
  it('finds the cleanest three hours of the day and marks the period in the dirtier half', () => {
    expect(analyseTiming(fullSchool(), dayCurve(), DATE)).toEqual({
      window: { start: 13, end: 16 },
      periods: [
        { start: '08:50', worse: true },
        { start: '13:10', worse: false },
      ],
    });
  });

  it("places a society's periods against its longer waking span, so early evening sits below the middle", () => {
    const timing = analyseTiming(fullSociety(), dayCurve(), DATE);
    expect(timing.window).toEqual({ start: 13, end: 16 });
    expect(timing.periods.map((period) => period.worse)).toEqual([true, false]);
  });

  it('knows nothing without a forecast or on a day the forecast does not cover', () => {
    const none = analyseTiming(fullSchool(), null, DATE);
    expect(none).toEqual({
      window: null,
      periods: [
        { start: '08:50', worse: null },
        { start: '13:10', worse: null },
      ],
    });
    expect(analyseTiming(fullSchool(), dayCurve(), '2026-12-25').window).toBeNull();
  });

  it('skips hours with no value and leaves a period it cannot place unknown', () => {
    const curve = dayCurve();
    const gaps = curve.hours.map((row, index) => (index === 24 + 9 ? { ...row, pm25: null } : row));
    const timing = analyseTiming(fullSchool(), { ...curve, hours: gaps }, DATE);
    expect(timing.window).toEqual({ start: 13, end: 16 });
    expect(timing.periods[0]).toEqual({ start: '08:50', worse: null });
  });

  it('marks nothing worse when the day is flat', () => {
    const curve = dayCurve();
    const flat = { ...curve, hours: curve.hours.map((row) => ({ ...row, pm25: 60 })) };
    const timing = analyseTiming(fullSchool(), flat, DATE);
    expect(timing.window).toEqual({ start: 7, end: 10 });
    expect(timing.periods.map((period) => period.worse)).toEqual([false, false]);
  });
});
