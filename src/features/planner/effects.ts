// The effects of changing one activity, used alike for candidates and for what-if toggles, and the search for
// the cleanest feasible start on the forecast curve.
import { SLOT_START_HOURS } from '../../config/limits.js';
import type { Activity } from '../household/types.js';
import { co2ChangeEffect } from '../ledger/co2-change.js';
import { meanPm25 } from '../ledger/curve.js';
import { modeEffect, shiftEffect, type ForecastSpan } from '../ledger/exposure.js';
import { clockOf, minutesOf } from '../../lib/time.js';
import type { Effect } from '../ledger/types.js';
import type { Situation } from './context.js';
import type { Slot } from './types.js';

/** Moves are only suggested to start at or after this minute of the day, 06:00. */
export const MOVE_FIRST_MINUTE = 6 * 60;
/** Moved activities must end by this minute of the day, 21:00. */
export const MOVE_LAST_MINUTE = 21 * 60;
/** A move is worth suggesting only when the forecast cuts the mean PM2.5 by at least this share. */
export const MIN_CUT = 0.1;

/** The slot a clock time falls in, by the slot start hours. Before the morning start counts as evening. */
export function slotOf(minute: number): Slot {
  const hour = Math.floor((((minute % 1440) + 1440) % 1440) / 60);
  if (hour >= SLOT_START_HOURS.evening || hour < SLOT_START_HOURS.morning) {
    return 'evening';
  }
  return hour >= SLOT_START_HOURS.afternoon ? 'afternoon' : 'morning';
}

function spanAt(s: Situation, start: number, minutes: number): ForecastSpan | null {
  const pm25 = meanPm25(s.day, start, minutes);
  return pm25 === null ? null : { label: `${clockOf(start)} to ${clockOf(start + minutes)}`, pm25 };
}

/** Starts an hour either side of this one that keep the activity inside the move window. */
export function nearbyStarts(start: number, minutes: number): number[] {
  return [start - 60, start + 60].filter((at) => at >= MOVE_FIRST_MINUTE && at + minutes <= MOVE_LAST_MINUTE);
}

function shiftFor(s: Situation, activity: Activity, start: number): Effect | null {
  const minutes = activity.durationMinutes;
  const from = spanAt(s, minutesOf(activity.start), minutes);
  const to = spanAt(s, start, minutes);
  const nearby = nearbyStarts(start, minutes).flatMap((at) => spanAt(s, at, minutes) ?? []);
  return from && to ? shiftEffect(activity.memberIds, { from, to }, nearby) : null;
}

function travelEffects(before: Activity, after: Activity): (Effect | null)[] {
  const [was, now] = [before.travel, after.travel];
  if (!was || !now || (was.mode === now.mode && was.occupancy === now.occupancy)) {
    return [];
  }
  return [co2ChangeEffect(was, now), modeEffect(before.memberIds, was.mode, now.mode)];
}

/** Every effect of changing an activity from before to after: its time, its travel mode or its occupancy. */
export function effectsBetween(s: Situation, before: Activity, after: Activity): Effect[] {
  const found: (Effect | null)[] = [];
  if (before.start !== after.start) {
    found.push(shiftFor(s, before, minutesOf(after.start)));
  }
  found.push(...travelEffects(before, after));
  return found.filter((effect) => effect !== null);
}

function clashes(s: Situation, activity: Activity, start: number): boolean {
  const end = start + activity.durationMinutes;
  return s.ctx.household.activities.some((other) => {
    const otherStart = minutesOf(other.start);
    const shared = other.id !== activity.id && other.memberIds.some((id) => activity.memberIds.includes(id));
    return shared && start < otherStart + other.durationMinutes && otherStart < end;
  });
}

/**
 * The cleanest whole-hour start for a flexible activity: inside the move window, not before notBefore, not
 * clashing with its members' other activities, and cutting the mean forecast PM2.5 by at least MIN_CUT. Ties go
 * to the start nearest the usual one. Null when no start qualifies or the forecast does not cover the hours.
 */
export function cleanestStart(s: Situation, activity: Activity): number | null {
  const minutes = activity.durationMinutes;
  const usual = meanPm25(s.day, minutesOf(activity.start), minutes);
  if (usual === null) {
    return null;
  }
  const starts = Array.from({ length: 16 }, (_, index) => MOVE_FIRST_MINUTE + index * 60).filter(
    (start) => start >= s.notBefore && start + minutes <= MOVE_LAST_MINUTE && !clashes(s, activity, start),
  );
  const scored = starts.flatMap((start) => {
    const mean = meanPm25(s.day, start, minutes);
    return mean !== null && mean <= usual * (1 - MIN_CUT) ? [{ start, mean }] : [];
  });
  const distance = (start: number): number => Math.abs(start - minutesOf(activity.start));
  scored.sort((a, b) => a.mean - b.mean || distance(a.start) - distance(b.start));
  return scored[0]?.start ?? null;
}
