// Tests for the numeral finder: what counts as a numeral, how each kind is read, and what is a name instead.
import { describe, expect, it } from 'vitest';
import { findNumerals } from '../../../src/features/assistant/numerals.js';

const raws = (text: string): string[] => findNumerals(text).map((numeral) => numeral.raw);

describe('findNumerals', () => {
  it('reads numerals in reading order whatever scanner found them', () => {
    expect(raws('On 24 Nov at 18:00, 30% of 1,00,000 homes, about twenty.')).toEqual([
      '24 Nov',
      '18:00',
      '30%',
      '1,00,000',
      'twenty',
    ]);
  });

  it('gives each kind its value', () => {
    expect(findNumerals('12,500 or 2.5% or 0.5 or .75')).toEqual([
      { kind: 'number', raw: '12,500', value: 12500, percent: false },
      { kind: 'number', raw: '2.5%', value: 2.5, percent: true },
      { kind: 'number', raw: '0.5', value: 0.5, percent: false },
      { kind: 'number', raw: '.75', value: 0.75, percent: false },
    ]);
  });

  it('splits commas that are not a thousands grouping', () => {
    expect(raws('rooms 10,20 and 3,4,5')).toEqual(['10', '20', '3', '4', '5']);
  });

  it('reads times with every reading they allow', () => {
    const minutes = (text: string) =>
      findNumerals(text).flatMap((n) => (n.kind === 'time' ? [n.minutes] : []));
    expect(minutes('6:30, 06:30, 18:30, 12 am, 12 pm, 6.30 pm, 7 बजे, 5 o’clock, 0:15')).toEqual([
      [390, 1110],
      [390],
      [1110],
      [0],
      [720],
      [1110],
      [420, 1140],
      [300, 1020],
      [15],
    ]);
  });

  it('reads dates in four forms with or without a year', () => {
    const dates = findNumerals('2026-11-24, 24/11/26, 24th November 2026, नवंबर 24, Dec 5').flatMap((n) =>
      n.kind === 'date' ? [[n.day, n.month, n.year]] : [],
    );
    expect(dates).toEqual([
      [24, 11, 2026],
      [24, 11, 2026],
      [24, 11, 2026],
      [24, 11, null],
      [5, 12, null],
    ]);
  });

  it('reads an impossible date or time as plain numbers so they are still checked', () => {
    expect(raws('31/13/2026 and 25:00')).toEqual(['31', '13', '2026', '25', '00']);
  });

  it('treats pollutant, mask and unit names as names, but not other letters glued to digits', () => {
    expect(
      raws('PM2.5, PM 10, pm1, CO2e, NO2, SO2, O3, NH3, N95, KN95, FFP2, 250 m³/h, 12 m2, पीएम 2.5'),
    ).toEqual(['250', '12']);
    expect(raws('AQI450 and COVID19')).toEqual(['450', '19']);
  });

  it('carries a percent back across a range', () => {
    const percents = findNumerals('30 to 60%, 10-20 percent, 5 and 9%, 4 कम 8%').map(
      (n) => n.kind === 'number' && n.percent,
    );
    expect(percents).toEqual([true, true, true, true, false, true, false, true]);
  });

  it('reads number words in English, Hindi and romanised Hindi, but not inside other words', () => {
    expect(raws('Half of twenty, दो और सौ, paanch hazaar, often tense, दोनों विचार नौकरी')).toEqual([
      'Half',
      'twenty',
      'दो',
      'सौ',
      'paanch',
      'hazaar',
    ]);
  });
});
