// Where the day's outdoor periods sit in the model forecast: the cleanest three hours and which periods fall in
// the dirtier half of the day. Only relative positions are kept; no concentration leaves this file.
import type { HourCurve } from '../air/types.js';
import { istParts, minutesOf } from './format.js';
import type { CommunityInput, CommunityKind } from './types.js';

const WINDOW_HOURS = 3;

/** Waking hours searched for a cleaner window, from the first hour up to the last, by kind. */
const SPAN: Readonly<Record<CommunityKind, readonly [number, number]>> = {
  school: [7, 17],
  housing_society: [6, 21],
};

/** The cleanest block of hours, start inclusive and end exclusive, in IST clock hours. */
export interface CleanerWindow {
  readonly start: number;
  readonly end: number;
}

/** One outdoor period and whether the forecast puts it in the dirtier half of the day; null when unknown. */
export interface PeriodTiming {
  readonly start: string;
  readonly worse: boolean | null;
}

/** The cleaner window, if the forecast covers one, and each outdoor period's place against the day. */
export interface Timing {
  readonly window: CleanerWindow | null;
  readonly periods: readonly PeriodTiming[];
}

const hoursFrom = (start: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => start + i);

function hourValues(forecast: HourCurve | null, date: string): Map<number, number> {
  const values = new Map<number, number>();
  for (const row of forecast?.hours ?? []) {
    const parts = istParts(Date.parse(row.time));
    if (parts.date === date && row.pm25 !== null) {
      values.set(parts.hour, row.pm25);
    }
  }
  return values;
}

function meanOf(values: ReadonlyMap<number, number>, hours: readonly number[]): number | null {
  const found = hours.flatMap((hour) => values.get(hour) ?? []);
  return found.length === hours.length ? found.reduce((sum, value) => sum + value, 0) / found.length : null;
}

function cleanerWindow(values: ReadonlyMap<number, number>, [from, to]: readonly [number, number]) {
  let best: (CleanerWindow & { mean: number }) | null = null;
  for (let start = from; start + WINDOW_HOURS <= to; start += 1) {
    const mean = meanOf(values, hoursFrom(start, WINDOW_HOURS));
    if (mean !== null && (best === null || mean < best.mean)) {
      best = { start, end: start + WINDOW_HOURS, mean };
    }
  }
  return best;
}

function middleValue(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.slice(Math.floor((sorted.length - 1) / 2), Math.floor(sorted.length / 2) + 1);
  return middle.reduce((sum, value) => sum + value, 0) / middle.length;
}

function periodHours(start: string, durationMinutes: number): number[] {
  const first = Math.floor(minutesOf(start) / 60);
  const last = Math.floor((minutesOf(start) + durationMinutes - 1) / 60);
  return hoursFrom(first, last - first + 1);
}

/**
 * Finds the cleanest three consecutive forecast hours in the waking span of the given IST date, and marks each
 * outdoor period worse when its hours average above the middle value of the span. Without a window, worse is null.
 */
export function analyseTiming(community: CommunityInput, forecast: HourCurve | null, date: string): Timing {
  const values = hourValues(forecast, date);
  const span = SPAN[community.kind];
  const best = cleanerWindow(values, span);
  const spanValues = hoursFrom(span[0], span[1] - span[0]).flatMap((hour) => values.get(hour) ?? []);
  const middle = best === null ? null : middleValue(spanValues);
  const periods = community.outdoorPeriods.map((period) => {
    const mean = meanOf(values, periodHours(period.start, period.durationMinutes));
    return { start: period.start, worse: middle === null || mean === null ? null : mean > middle };
  });
  return { window: best === null ? null : { start: best.start, end: best.end }, periods };
}
