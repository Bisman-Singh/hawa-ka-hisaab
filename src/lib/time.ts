// Clock times and dates in Indian time, one way for the whole app: minutes after midnight and HH:MM, an instant's
// IST date and clock time, and dates in English or Hindi words.
import type { Language } from './types.js';

const IST_OFFSET_MS = 19_800_000;

const MONTHS: Readonly<Record<Language, readonly string[]>> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
};

/** Minutes since midnight for an HH:MM clock time. */
export function minutesOf(clock: string): number {
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
}

/** HH:MM for minutes since midnight, wrapping past midnight. */
export function clockOf(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** The calendar date, month and clock time of an instant in IST. */
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

/** The IST clock time of an ISO instant, whatever offset it is written with, such as 22:00. */
export function istClock(iso: string): string {
  const { hour, minute } = istParts(Date.parse(iso));
  return clockOf(hour * 60 + minute);
}

function dayMonth(isoDate: string, language: Language): string {
  const month = Number(isoDate.slice(5, 7));
  return `${String(Number(isoDate.slice(8, 10)))} ${MONTHS[language].slice(month - 1, month).join('')}`;
}

/** The IST day of an ISO instant, such as 24 Nov. */
export function istDay(iso: string): string {
  return dayMonth(istParts(Date.parse(iso)).date, 'en');
}

/** An ISO date such as 2026-11-26 as 26 Nov 2026 in English or 26 नवंबर 2026 in Hindi. */
export function dateText(isoDate: string, language: Language = 'en'): string {
  return `${dayMonth(isoDate, language)} ${isoDate.slice(0, 4)}`;
}
