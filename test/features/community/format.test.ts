// Tests for notice formatting: IST parts, numbers, clock times, dates in both languages, lists and numerals.
import { describe, expect, it } from 'vitest';
import {
  clockText,
  dateText,
  formatNumber,
  istParts,
  joinList,
  minutesOf,
  numeralsIn,
  pairs,
} from '../../../src/features/community/format.js';

describe('istParts', () => {
  it('reads an instant in IST, across the date line', () => {
    expect(istParts(Date.parse('2026-11-25T19:00:00Z'))).toEqual({
      date: '2026-11-26',
      month: 11,
      hour: 0,
      minute: 30,
    });
  });
});

describe('formatNumber and clockText', () => {
  it('writes at most one decimal place and pads clock times', () => {
    expect([formatNumber(583.5), formatNumber(800), formatNumber(2.25), formatNumber(0.04)]).toEqual([
      '583.5',
      '800',
      '2.3',
      '0',
    ]);
    expect(clockText(7, 5)).toBe('07:05');
    expect(minutesOf('13:10')).toBe(790);
  });
});

describe('dateText', () => {
  it('writes the date in English and Hindi with the same digits', () => {
    expect(dateText('2026-11-07', 'en')).toBe('7 Nov 2026');
    expect(dateText('2026-11-07', 'hi')).toBe('7 नवंबर 2026');
    expect(dateText('2027-01-26', 'hi')).toBe('26 जनवरी 2027');
  });
});

describe('joinList', () => {
  it('joins none, one, two and three items', () => {
    expect([joinList([], 'and'), joinList(['a'], 'and'), joinList(['a', 'b'], 'और')]).toEqual([
      '',
      'a',
      'a और b',
    ]);
    expect(joinList(['a', 'b', 'c'], 'and')).toBe('a, b and c');
  });
});

describe('numeralsIn', () => {
  it('reads ASCII and Devanagari numerals, times and decimals', () => {
    expect(numeralsIn('AQI 312 at 07:30, N95, 1.5 min')).toEqual([312, 7, 30, 95, 1.5]);
    expect(numeralsIn('१२ बजे')).toEqual([12]);
    expect(numeralsIn('no numbers')).toEqual([]);
  });
});

describe('pairs', () => {
  it('pairs items by position up to the shorter list', () => {
    expect(pairs([1, 2, 3], ['a', 'b'])).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });
});
