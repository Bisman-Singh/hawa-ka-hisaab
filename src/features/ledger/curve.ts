// Reads the forecast curve for one day: PM2.5 by hour after midnight IST, and the mean over a span of minutes.
import type { HourCurve } from '../air/types.js';

const HOUR_MS = 3_600_000;

/** Modelled PM2.5 by whole hours after midnight IST of one date. Hour 24 is midnight of the next day. */
export type DayCurve = ReadonlyMap<number, number>;

/** The curve's PM2.5 values keyed by hour of the given IST date. Rows off the hour or without PM2.5 are left out. */
export function dayCurve(curve: HourCurve | null, date: string): DayCurve {
  const midnight = Date.parse(`${date}T00:00:00+05:30`);
  const hours = new Map<number, number>();
  for (const row of curve?.hours ?? []) {
    const offset = (Date.parse(row.time) - midnight) / HOUR_MS;
    if (row.pm25 !== null && Number.isInteger(offset)) {
      hours.set(offset, row.pm25);
    }
  }
  return hours;
}

/**
 * The time weighted mean PM2.5 over a span that starts startMinute minutes after midnight and lasts minutes.
 * Null when the span is empty or any hour it touches has no value.
 */
export function meanPm25(day: DayCurve, startMinute: number, minutes: number): number | null {
  const end = startMinute + minutes;
  let total = 0;
  for (let hour = Math.floor(startMinute / 60); hour * 60 < end; hour += 1) {
    const value = day.get(hour);
    if (value === undefined) {
      return null;
    }
    total += value * (Math.min(end, (hour + 1) * 60) - Math.max(startMinute, hour * 60));
  }
  return minutes > 0 ? total / minutes : null;
}
