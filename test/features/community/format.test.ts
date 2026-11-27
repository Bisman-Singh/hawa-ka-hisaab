// Tests for notice formatting: numbers, lists and numerals.
import { describe, expect, it } from 'vitest';
import { formatNumber, joinList, numeralsIn, pairs } from '../../../src/features/community/format.js';

describe('formatNumber', () => {
  it('writes at most one decimal place', () => {
    expect([formatNumber(583.5), formatNumber(800), formatNumber(2.25), formatNumber(0.04)]).toEqual([
      '583.5',
      '800',
      '2.3',
      '0',
    ]);
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
