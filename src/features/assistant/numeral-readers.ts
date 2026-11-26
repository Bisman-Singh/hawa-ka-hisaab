// Readers that turn one regular expression match into numerals: dates, times of day, numbers and number words.
// The numeral finder decides which pattern runs; these decide what a match means.
import { MONTH_NAMES, NUMBER_WORDS } from './numeral-words.js';

/** A number as written. percent is set when a percent sign or word follows it or the end of its range. */
export interface NumberNumeral {
  readonly kind: 'number';
  readonly raw: string;
  readonly value: number;
  readonly percent: boolean;
}

/** A time of day in minutes after midnight. A time without am or pm, such as 6:30, has both readings. */
export interface TimeNumeral {
  readonly kind: 'time';
  readonly raw: string;
  readonly minutes: readonly number[];
}

/** A calendar date. year is null when the text gives none. */
export interface DateNumeral {
  readonly kind: 'date';
  readonly raw: string;
  readonly day: number;
  readonly month: number;
  readonly year: number | null;
}

/** Anything in a text that states a quantity, a time or a date. */
export type Numeral = NumberNumeral | TimeNumeral | DateNumeral;

/** Reads one match. An empty list means the match was not a numeral after all, such as 31/13/2026. */
export type Read = (match: RegExpExecArray) => readonly Numeral[];

const PERCENT = /^\s*(?:%|per\s?cent(?!\p{L})|प्रतिशत|फ़ीसदी|फीसदी|pratishat|fisadi)/iu;
const GROUPED = /^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/;

const tidy = (raw: string): string => raw.trim().replace(/(?<!\.\p{L})\.$/u, '');
const percentAfter = (match: RegExpExecArray, length: number): boolean =>
  PERCENT.test(match.input.slice(match.index + length));

function asciiDigit(char: string): string {
  let code = Number(char.codePointAt(0));
  let back = 0;
  while (/\p{Nd}/u.test(String.fromCodePoint(code - 1))) {
    code -= 1;
    back += 1;
  }
  return String(back % 10);
}

/** NFKC form with every decimal digit of any script turned into 0 to 9. Lengths can change, so scan this form. */
export function normalizeNumerals(text: string): string {
  return text.normalize('NFKC').replace(/[^\P{Nd}0-9]/gu, asciiDigit);
}

const yearOf = (text: string | undefined): number | null =>
  text === undefined ? null : Number(text) + (text.length === 2 ? 2000 : 0);
const isDate = (day: number, month: number): boolean => day >= 1 && day <= 31 && month >= 1 && month <= 12;

/** A date reader for the given groups: day, month as a number or a name, and an optional year. */
export function dateBy(groups: { day: number; month: number; year: number; named: boolean }): Read {
  return (match) => {
    const day = Number(match[groups.day]);
    const monthText = (match[groups.month] ?? '').toLowerCase();
    const month = groups.named ? (MONTH_NAMES.get(monthText) ?? 0) : Number(monthText);
    const year = yearOf(match[groups.year]);
    return isDate(day, month) ? [{ kind: 'date', raw: tidy(match[0]), day, month, year }] : [];
  };
}

function readings(hour: number, minute: number, clock: { half: string; padded: boolean }): number[] {
  const base = (hour % 12) * 60 + minute;
  if (hour > 12 || hour === 0 || (clock.half === '' && clock.padded)) {
    return [hour * 60 + minute];
  }
  if (clock.half === 'a') {
    return [base];
  }
  return clock.half === 'p' ? [base + 720] : [base, base + 720];
}

/** A time reader for the hour, minute and am or pm groups. Group 0 means the pattern has none. */
export function timeBy(groups: { hour: number; minute: number; half: number }): Read {
  return (match) => {
    const hourText = match[groups.hour] ?? '';
    const hour = Number(hourText);
    const minute = Number(match[groups.minute] ?? '0');
    const half = groups.half === 0 ? '' : (match[groups.half] ?? '').toLowerCase();
    const minutes = readings(hour, minute, { half, padded: hourText.startsWith('0') });
    return hour > 23 || minute > 59 ? [] : [{ kind: 'time', raw: tidy(match[0]), minutes }];
  };
}

/** Reads digits. Indian and Western thousands groupings are one number; other commas separate numbers. */
export const readNumbers: Read = (match) => {
  const raw = match[0].replace(/,+$/, '');
  const percent = percentAfter(match, raw.length);
  const parts = GROUPED.test(raw) ? [raw] : raw.split(',').filter((part) => part !== '');
  return parts.map((part) => ({
    kind: 'number',
    raw: percent ? `${part}%` : part,
    value: Number(part.replaceAll(',', '')),
    percent,
  }));
};

/** Reads a number word through the word table. */
export const readWord: Read = (match) => [
  {
    kind: 'number',
    raw: match[0],
    value: NUMBER_WORDS.get(match[0].toLowerCase()) ?? Number.NaN,
    percent: percentAfter(match, match[0].length),
  },
];
