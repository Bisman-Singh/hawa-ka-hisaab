// Tests for the numeral forms: normalising glued digits, fractions, Roman numerals, compounds and unknown digits.
import { describe, expect, it } from 'vitest';
import {
  normalizeNumerals,
  readCompound,
  readFraction,
  readFractionWord,
  readRoman,
  readUnknown,
  romanValue,
} from '../../../src/features/assistant/numeral-forms.js';

const match = (pattern: RegExp, text: string): RegExpExecArray => {
  const found = pattern.exec(text);
  if (!found) {
    throw new Error('pattern did not match');
  }
  return found;
};

describe('normalizeNumerals', () => {
  it('turns digits of any script into 0 to 9', () => {
    expect(normalizeNumerals('२४६ ৯৯৯ ௫ ４５ 𝟗𝟖 ٣')).toBe('246 999 5 45 98 3');
  });

  it('joins digits glued by invisible characters or thin spaces, but not by an ordinary space', () => {
    expect(normalizeNumerals('4\u{200D}5\u{200C}0 2\u{034F}5 2\u{FE00}5 2\u{202F}5 2\u{2009}5 2 5')).toBe(
      '450 25 25 25 25 2 5',
    );
    expect(normalizeNumerals('a\u{200D}b')).toBe('a\u{200D}b');
  });

  it('folds Hindi spellings as the word tables are keyed', () => {
    expect(normalizeNumerals('पाँच हज़ार')).toBe('पांच हजार');
  });
});

describe('romanValue', () => {
  it('reads I to XXXIX in canonical upper case and nothing else', () => {
    expect(['I', 'II', 'IV', 'V', 'VIII', 'IX', 'X', 'XII', 'XIV', 'XXXIX'].map(romanValue)).toEqual([
      1, 2, 4, 5, 8, 9, 10, 12, 14, 39,
    ]);
    expect(['', 'IIII', 'VX', 'IIV', 'XL', 'ii', 'MCD'].map(romanValue)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });
});

describe('the form readers', () => {
  it('read Roman numerals in group 1 and refuse ones that are not canonical', () => {
    expect(readRoman(match(/([IVX]+)/u, 'Stage IV'))).toEqual([
      { kind: 'number', raw: 'IV', value: 4, percent: false },
    ]);
    expect(readRoman(match(/([IVX]+)/u, 'IIII'))).toEqual([]);
    expect(readRoman(match(/(Q)?/u, 'IV'))).toEqual([]);
  });

  it('read a fraction, a compound and an unreadable number character', () => {
    expect(readFraction(match(/(\d+)⁄(\d+)/u, '3⁄4'))[0]).toMatchObject({ value: 0.75 });
    expect(readFraction(match(/(\d+)⁄(\d+)/u, '3⁄0'))[0]).toMatchObject({ value: 3 });
    expect(readCompound(match(/(\w+)-(\w+)/u, 'Forty-two'))[0]).toMatchObject({ value: 42 });
    expect(readCompound(match(/(\w+)-(\w+)()/u, 'eleven-umpteen'))[0]).toMatchObject({ value: 0 });
    expect(readUnknown(match(/./u, '⓯'))[0]).toMatchObject({ raw: '⓯', value: Number.NaN });
  });

  it('read fraction words with the number after them, in digits or words, and over a hundred as a share', () => {
    const value = (text: string): number | undefined => {
      const found = readFractionWord(match(/(\S+)\s+(\S+)/u, text))[0];
      return found?.kind === 'number' ? found.value : undefined;
    };
    expect([
      value('साढे तीन'),
      value('सवा 2'),
      value('पौने दो'),
      value('सवा सौ'),
      value('sadhe chaar'),
    ]).toEqual([3.5, 2.25, 1.75, 125, 4.5]);
    expect(value('umm umpteen')).toBeNaN();
    expect(readFractionWord(match(/(Q)?(R)?/u, 'z'))[0]).toMatchObject({ value: Number.NaN });
    expect(readCompound(match(/(Q)?(R)?/u, 'z'))[0]).toMatchObject({ value: 0 });
  });
});
