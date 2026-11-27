// Tests for the modelled index: trailing windows, the CO unit, the minimum data rule and the worst sub-index.
import { describe, expect, it } from 'vitest';
import type { HourlyAir } from '../../../src/features/air/types.js';
import { estimateNaqi } from '../../../src/features/naqi/estimate.js';
import { naqiEstimateSchema } from '../../../src/features/naqi/schemas.js';

const HOUR = 3_600_000;
const END = Date.parse('2026-11-24T22:00:00+05:30');

type Values = Partial<Record<'pm25' | 'pm10' | 'no2' | 'so2' | 'o3' | 'co', number | null>>;

function rows(count: number, values: Values, endMs = END): HourlyAir[] {
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(endMs - (count - 1 - index) * HOUR).toISOString(),
    pm25: null,
    pm10: null,
    no2: null,
    so2: null,
    o3: null,
    co: null,
    ...values,
  }));
}

describe('estimateNaqi', () => {
  it('turns 24 hours of PM2.5 at 31 into sub-index 51, as in the CPCB example', () => {
    const estimate = estimateNaqi(rows(24, { pm25: 31, no2: 10, so2: 10 }), END);
    expect(estimate).toMatchObject({
      status: 'computed',
      value: 51,
      band: 'satisfactory',
      predominant: 'pm25',
    });
    expect(naqiEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  it('averages only the hours up to and including the model hour', () => {
    const past = rows(24, { pm25: 60, no2: 10, so2: 10 });
    const before = rows(24, { pm25: 500, no2: 10, so2: 10 }, END - 24 * HOUR);
    const after = rows(5, { pm25: 500, no2: 10, so2: 10 }, END + 5 * HOUR);
    const estimate = estimateNaqi([...before, ...past, ...after], END);
    expect(estimate.status === 'computed' && estimate.subIndices[0]).toEqual({
      pollutant: 'pm25',
      subIndex: 100,
      meanConcentration: 60,
      unit: 'ug_m3',
      averagingHours: 24,
    });
  });

  it('uses 8 hour means for CO and O3 and converts CO to milligrams', () => {
    const old = rows(16, { co: 30_000, o3: 400, pm10: 100 }, END - 8 * HOUR);
    const recent = rows(8, { co: 1500, o3: 50, pm10: 100 });
    const estimate = estimateNaqi([...old, ...recent], END);
    const co =
      estimate.status === 'computed' ? estimate.subIndices.find((entry) => entry.pollutant === 'co') : null;
    expect(co).toEqual({
      pollutant: 'co',
      subIndex: 73,
      meanConcentration: 1.5,
      unit: 'mg_m3',
      averagingHours: 8,
    });
    const o3 =
      estimate.status === 'computed' ? estimate.subIndices.find((entry) => entry.pollutant === 'o3') : null;
    expect(o3?.subIndex).toBe(50);
  });

  it('needs 16 of 24 hours for a 24 hour mean and 6 of 8 for an 8 hour mean', () => {
    const gappy = rows(24, { pm25: 40, no2: 10, so2: 10, o3: 20 }).map((row, index) =>
      index < 9 ? { ...row, pm25: null } : row,
    );
    expect(estimateNaqi(gappy, END)).toEqual({
      status: 'insufficient',
      reason: 'no_particulate',
      available: ['no2', 'so2', 'o3'],
    });
    const enough = gappy.map((row, index) => (index === 8 ? { ...row, pm25: 40 } : row));
    expect(estimateNaqi(enough, END).status).toBe('computed');
    const fiveOfEight = rows(8, { co: 1000 }).map((row, index) => (index < 3 ? { ...row, co: null } : row));
    expect(estimateNaqi(fiveOfEight, END)).toMatchObject({ status: 'insufficient', available: [] });
  });

  it('refuses an index from fewer than three pollutants', () => {
    expect(estimateNaqi(rows(24, { pm25: 80, pm10: 90 }), END)).toEqual({
      status: 'insufficient',
      reason: 'too_few_pollutants',
      available: ['pm25', 'pm10'],
    });
    expect(estimateNaqi([], END)).toEqual({
      status: 'insufficient',
      reason: 'too_few_pollutants',
      available: [],
    });
  });

  it('lets the worst sub-index win, and a particulate win a tie', () => {
    const worstNo2 = estimateNaqi(rows(24, { pm25: 31, pm10: 51, no2: 181 }), END);
    expect(worstNo2).toMatchObject({ value: 201, band: 'poor', predominant: 'no2' });
    const tie = estimateNaqi(rows(24, { pm25: 60, pm10: 100, no2: 80 }), END);
    expect(tie).toMatchObject({ value: 100, predominant: 'pm25' });
  });

  describe('ozone above the 8 hour rows', () => {
    const ozone = (hours: readonly number[]) => {
      const day = rows(24, { pm10: 100, no2: 10 });
      const series = [...Array<number | null>(24 - hours.length).fill(null), ...hours];
      const estimate = estimateNaqi(
        day.map((row, index) => ({ ...row, o3: series[index] ?? null })),
        END,
      );
      return estimate.status === 'computed'
        ? estimate.subIndices.find((entry) => entry.pollutant === 'o3')
        : null;
    };
    const flat = (value: number) => Array<number>(8).fill(value);

    it('reads an 8 hour mean up to 208 against the 8 hour rows', () => {
      expect(ozone(flat(208))).toMatchObject({ subIndex: 300, meanConcentration: 208, averagingHours: 8 });
      expect(ozone(flat(208.4))).toMatchObject({ subIndex: 300, averagingHours: 8 });
      expect(ozone([700, ...Array<number>(7).fill(71)])).toMatchObject({ subIndex: 173, averagingHours: 8 });
    });

    it('reads the highest hour against the one hour rows once the 8 hour mean is above 208', () => {
      expect(ozone(flat(208.5))).toEqual({
        pollutant: 'o3',
        subIndex: 301,
        meanConcentration: 209,
        unit: 'ug_m3',
        averagingHours: 1,
      });
      expect(ozone([748, ...Array<number>(7).fill(227)])).toMatchObject({
        subIndex: 400,
        meanConcentration: 748,
        averagingHours: 1,
      });
      expect(ozone([749, ...Array<number>(7).fill(227)])).toMatchObject({ subIndex: 401, averagingHours: 1 });
      expect(
        naqiEstimateSchema.safeParse(estimateNaqi(rows(24, { pm10: 100, no2: 10, o3: 300 }), END)).success,
      ).toBe(true);
    });
  });
});
