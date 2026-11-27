// The forms of a number the finder normalises or reads beyond plain digits and words: digits glued by invisible
// characters, fractions, Roman numerals, compound and fraction words, and number characters it cannot read.
import type { NumberNumeral, Read } from './numeral-readers.js';
import { ENGLISH_TENS, ENGLISH_UNITS, FRACTION_PREFIXES, NUMBER_WORDS, wordKey } from './numeral-words.js';

const GLUE = /(?<=\p{N})[\p{Cf}\p{Mn}\p{Me}\u{180E}\u{2007}\u{2009}\u{200A}\u{202F}\u{205F}]+(?=\p{N})/gu;
const NUKTA = /\u093C/gu;
const CHANDRABINDU = /\u0901/gu;

function asciiDigit(char: string): string {
  let code = Number(char.codePointAt(0));
  let back = 0;
  while (/\p{Nd}/u.test(String.fromCodePoint(code - 1))) {
    code -= 1;
    back += 1;
  }
  return String(back % 10);
}

/**
 * The form the finder scans. Invisible characters and thin spaces between two number characters are removed first,
 * so digits that look joined are read as one number. Then NFKC, every decimal digit of any script as 0 to 9, nukta
 * dots dropped and chandrabindu read as anusvara, as the word tables are keyed. Lengths can change.
 */
export function normalizeNumerals(text: string): string {
  return text
    .replace(GLUE, '')
    .normalize('NFKC')
    .replace(/[^\P{Nd}0-9]/gu, asciiDigit)
    .replace(NUKTA, '')
    .replace(CHANDRABINDU, '\u0902');
}

const number = (raw: string, value: number): NumberNumeral => ({
  kind: 'number',
  raw,
  value,
  percent: false,
});

/** Reads a fraction NFKC made from a fraction character, such as 1⁄2 from ½. */
export const readFraction: Read = (match) => [
  number(match[0], Number(match[1]) / Math.max(1, Number(match[2]))),
];

/** Reads a number character the finder has no value for, such as a circled or dingbat digit, as unknown. */
export const readUnknown: Read = (match) => [number(match[0], Number.NaN)];

const ROMAN = /^X{0,3}(?:IX|IV|V?I{0,3})$/u;
const ROMAN_UNITS: Readonly<Record<string, number>> = { IX: 9, IV: 4 };

/** The value of a Roman numeral from I to XXXIX in upper case, or null when it is not one. */
export function romanValue(text: string): number | null {
  if (text === '' || !ROMAN.test(text)) {
    return null;
  }
  const tens = text.length - text.replace(/^X+/u, '').length;
  const units = text.slice(tens);
  return tens * 10 + (ROMAN_UNITS[units] ?? (units.startsWith('V') ? 4 : 0) + units.length);
}

/** Reads a Roman numeral in group 1. A match that is not a canonical numeral is not a number. */
export const readRoman: Read = (match) => {
  const raw = match[1] ?? '';
  const value = romanValue(raw);
  return value === null ? [] : [number(raw, value)];
};

/** Reads an English compound such as twenty-five as one value. */
export const readCompound: Read = (match) => [
  number(
    match[0],
    (ENGLISH_TENS.get(wordKey(match[1] ?? '')) ?? 0) + (ENGLISH_UNITS.get(wordKey(match[2] ?? '')) ?? 0),
  ),
];

/** Reads a fraction word and the number after it, such as साढ़े तीन for 3.5 or सवा सौ for 125. */
export const readFractionWord: Read = (match) => {
  const change = FRACTION_PREFIXES.get(wordKey(match[1] ?? '')) ?? 0;
  const said = match[2] ?? '';
  const base = /^\d/u.test(said) ? Number(said) : (NUMBER_WORDS.get(wordKey(said)) ?? Number.NaN);
  return [number(match[0], base >= 100 ? base * (1 + change) : base + change)];
};
