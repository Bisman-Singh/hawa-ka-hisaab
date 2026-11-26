// Tests for the number word and month tables.
import { describe, expect, it } from 'vitest';
import { MONTH_NAMES, NUMBER_WORDS } from '../../../src/features/assistant/numeral-words.js';

describe('NUMBER_WORDS', () => {
  it('holds values for English, Hindi and romanised Hindi words, keyed in NFKC form', () => {
    expect(NUMBER_WORDS.get('fifty')).toBe(50);
    expect(NUMBER_WORDS.get('lakh')).toBe(100_000);
    expect(NUMBER_WORDS.get('करोड़'.normalize('NFKC'))).toBe(10_000_000);
    expect(NUMBER_WORDS.get('ढाई')).toBe(2.5);
    expect(NUMBER_WORDS.get('dedh')).toBe(1.5);
    expect([...NUMBER_WORDS.values()].every((value) => Number.isFinite(value))).toBe(true);
  });

  it('leaves out one, so a count of one reads as a plain word', () => {
    expect(['one', 'एक', 'ek'].map((word) => NUMBER_WORDS.has(word))).toEqual([false, false, false]);
  });
});

describe('MONTH_NAMES', () => {
  it('maps every month in English, short English and Hindi', () => {
    expect(new Set(MONTH_NAMES.values()).size).toBe(12);
    expect([
      MONTH_NAMES.get('nov'),
      MONTH_NAMES.get('नवंबर'),
      MONTH_NAMES.get('फ़रवरी'.normalize('NFKC')),
    ]).toEqual([11, 11, 2]);
  });
});
