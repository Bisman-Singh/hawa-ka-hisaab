// Reading hours in Indian time, the age of a reading, and whether it is stale, worked out in the browser.
import { FEED_STALE_AFTER_MINUTES } from '../../config/limits.js';

const IST_OFFSET_MS = 330 * 60_000;
const two = (value: number): string => String(value).padStart(2, '0');
const month = (at: Date): string =>
  'JanFebMarAprMayJunJulAugSepOctNovDec'.slice(at.getUTCMonth() * 3, at.getUTCMonth() * 3 + 3);
const ist = (iso: string): Date => new Date(Date.parse(iso) + IST_OFFSET_MS);

/** The clock time of a timestamp in Indian time, such as "22:00". */
export function istClock(iso: string): string {
  const at = ist(iso);
  return `${two(at.getUTCHours())}:${two(at.getUTCMinutes())}`;
}

/** The day of a timestamp in Indian time, such as "24 Nov". */
export function istDay(iso: string): string {
  const at = ist(iso);
  return `${String(at.getUTCDate())} ${month(at)}`;
}

/** A calendar date such as 2026-11-17 in words, such as "17 Nov 2026". */
export function dateWords(isoDate: string): string {
  const at = new Date(`${isoDate}T00:00:00Z`);
  return `${String(at.getUTCDate())} ${month(at)} ${String(at.getUTCFullYear())}`;
}

/** How long ago a timestamp was, such as "4 hours 40 minutes". */
export function ageWords(iso: string, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60_000));
  const hours = Math.floor(minutes / 60);
  const parts = [
    hours === 0 ? '' : `${String(hours)} ${hours === 1 ? 'hour' : 'hours'}`,
    minutes % 60 === 0 && hours > 0 ? '' : `${String(minutes % 60)} minutes`,
  ];
  return parts.filter((part) => part !== '').join(' ');
}

/** True when a reading hour is older than the stale limit, or the server already said so. */
export function isStale(iso: string, nowMs: number, flagged: boolean): boolean {
  return flagged || nowMs - Date.parse(iso) > FEED_STALE_AFTER_MINUTES * 60_000;
}
