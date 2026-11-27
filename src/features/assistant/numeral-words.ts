// Number words and month names in English, Hindi and romanised Hindi, from numeral-words.json, for the finder.
// One and its Hindi forms are left out on purpose: the guard lets a count of one through as a plain word.

import WORDS from './numeral-words.json' with { type: 'json' };

const NUKTA = /\u093C/gu;
const CHANDRABINDU = /\u0901/gu;

/** A word as the finder compares it: NFKC, lower case, with nukta dots dropped and chandrabindu read as anusvara. */
export function wordKey(word: string): string {
  return word.normalize('NFKC').toLowerCase().replace(NUKTA, '').replace(CHANDRABINDU, '\u0902');
}

const table = (words: Readonly<Record<string, number>>): ReadonlyMap<string, number> =>
  new Map(Object.entries(words).map(([word, value]): [string, number] => [wordKey(word), value]));

/**
 * Words that state a quantity, with their values: English number words, ordinals and counting nouns, Hindi number
 * words from zero to a hundred with their common spellings and larger units, and romanised Hindi. Second and first
 * are left out, since they mean time and one; teen too, which in English text means a teenager. Compound phrases
 * are read by the finder's compound patterns.
 */
export const NUMBER_WORDS = table({ ...WORDS.english, ...WORDS.hindi, ...WORDS.romanised });

/** English tens that take a unit after a hyphen or space, such as twenty-five. */
export const ENGLISH_TENS = table(WORDS.englishTens);

/** English units one to nine for compounds such as twenty-one. */
export const ENGLISH_UNITS = table(WORDS.englishUnits);

/** Fraction words that change the number after them: a quarter more, a half more, a quarter less. */
export const FRACTION_PREFIXES = table(WORDS.fractionPrefixes);

/** Month names and short forms with their month numbers, 1 for January. */
export const MONTH_NAMES = table(WORDS.months);
