// Tests for the number word and month tables.
import { describe, expect, it } from 'vitest';
import {
  ENGLISH_TENS,
  ENGLISH_UNITS,
  FRACTION_PREFIXES,
  MONTH_NAMES,
  NUMBER_WORDS,
  wordKey,
} from '../../../src/features/assistant/numeral-words.js';

describe('NUMBER_WORDS', () => {
  it('holds values for English, Hindi and romanised Hindi words, keyed by wordKey', () => {
    expect(NUMBER_WORDS.get('fifty')).toBe(50);
    expect(NUMBER_WORDS.get('lakh')).toBe(100_000);
    expect(NUMBER_WORDS.get(wordKey('करोड़'))).toBe(10_000_000);
    expect(NUMBER_WORDS.get('ढाई')).toBe(2.5);
    expect(NUMBER_WORDS.get('dedh')).toBe(1.5);
    expect([...NUMBER_WORDS.values()].every((value) => Number.isFinite(value))).toBe(true);
  });

  it('leaves out one, so a count of one reads as a plain word', () => {
    expect(['one', 'एक', 'ek'].map((word) => NUMBER_WORDS.has(word))).toEqual([false, false, false]);
  });

  it('has a Hindi word for every whole number from two to a hundred, and zero', () => {
    const hindi = [...NUMBER_WORDS].filter(([word]) => /\p{Script=Devanagari}/u.test(word));
    const whole = new Set(hindi.map(([, value]) => value).filter((value) => Number.isInteger(value)));
    const wanted = [0, ...Array.from({ length: 99 }, (_, index) => index + 2)];
    expect(wanted.filter((value) => !whole.has(value))).toEqual([]);
  });

  it('reads Hindi spelling variants alike and leaves out English words that only look like numbers', () => {
    expect(wordKey('पाँच')).toBe(wordKey('पांच'));
    expect(NUMBER_WORDS.get(wordKey('अड़तालीस'))).toBe(48);
    expect(NUMBER_WORDS.get(wordKey('अडतालीस'))).toBe(48);
    expect(NUMBER_WORDS.get(wordKey('हज़ार'))).toBe(1000);
    expect(['teen', 'do', 'second', 'first', 'sat'].filter((word) => NUMBER_WORDS.has(word))).toEqual([]);
    expect(
      ['das', 'chaar', 'solah', 'pachees', 'assi', 'nabbe', 'fifteenth', 'fortnight'].map((word) =>
        NUMBER_WORDS.get(word),
      ),
    ).toEqual([10, 4, 16, 25, 80, 90, 15, 14]);
  });
});

describe('the compound tables', () => {
  it('hold the English tens and units and the Hindi fraction prefixes', () => {
    expect([
      ENGLISH_TENS.get('ninety'),
      ENGLISH_UNITS.get('one'),
      ENGLISH_TENS.size,
      ENGLISH_UNITS.size,
    ]).toEqual([90, 1, 8, 9]);
    expect([
      FRACTION_PREFIXES.get(wordKey('सवा')),
      FRACTION_PREFIXES.get(wordKey('साढ़े')),
      FRACTION_PREFIXES.get('paune'),
    ]).toEqual([0.25, 0.5, -0.25]);
  });
});

describe('MONTH_NAMES', () => {
  it('maps every month in English, short English and Hindi', () => {
    expect(new Set(MONTH_NAMES.values()).size).toBe(12);
    expect([MONTH_NAMES.get('nov'), MONTH_NAMES.get('नवंबर'), MONTH_NAMES.get(wordKey('फ़रवरी'))]).toEqual([
      11, 11, 2,
    ]);
  });
});
