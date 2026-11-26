// Formatting for notices: IST dates and clock times, plain numbers, lists, and reading numerals back out of text.
import type { Language } from '../../lib/types.js';

const IST_OFFSET_MS = 19_800_000;

const MONTHS: Readonly<Record<Language, readonly string[]>> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
};

/** The calendar date and clock time of an instant in IST. */
export interface IstParts {
  readonly date: string;
  readonly month: number;
  readonly hour: number;
  readonly minute: number;
}

/** Splits an instant in epoch milliseconds into its IST date and clock time. */
export function istParts(ms: number): IstParts {
  const shifted = new Date(ms + IST_OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    month: shifted.getUTCMonth() + 1,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** A number as a notice shows it: at most one decimal place, no grouping, ASCII digits in both languages. */
export function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** A 24 hour clock time such as 07:30. */
export function clockText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Minutes after midnight for an HH:MM clock time. */
export function minutesOf(clock: string): number {
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
}

/** An ISO date such as 2026-11-26 as 26 Nov 2026 in English or 26 नवंबर 2026 in Hindi. */
export function dateText(isoDate: string, lang: Language): string {
  const month = Number(isoDate.slice(5, 7));
  const name = MONTHS[lang].slice(month - 1, month).join('');
  return `${String(Number(isoDate.slice(8, 10)))} ${name} ${isoDate.slice(0, 4)}`;
}

/** Joins items as "a, b and c" with the given word for and. */
export function joinList(items: readonly string[], and: string): string {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${and} ${items.slice(-1).join('')}`;
}

/** Every number written in a text, with Devanagari digits read as ASCII ones. */
export function numeralsIn(text: string): number[] {
  const ascii = text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
  return [...ascii.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

/** Items of two lists paired by position, as long as the shorter list. */
export function pairs<A, B>(left: readonly A[], right: readonly B[]): [A, B][] {
  return left.flatMap((item, index) => right.slice(index, index + 1).map((other): [A, B] => [item, other]));
}
