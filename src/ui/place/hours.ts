// The age of a reading and whether it is stale, worked out in the browser.
import { FEED_STALE_AFTER_MINUTES } from '../../config/limits.js';

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
