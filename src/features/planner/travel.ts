// Travel changes for one trip: the bus, the metro or one more person in the car, each with the effects code
// computed. swap.ts makes the best one a swap item in the day plan and the others its what-if toggles.
import type { Activity, ActivityKind, HouseholdPatch, Travel, TravelMode } from '../household/types.js';
import type { Effect } from '../ledger/types.js';
import { bandAtLeast, type Situation } from './context.js';
import { effectsBetween } from './effects.js';

/** Which change a travel option makes. */
export type OptionKey = 'bus' | 'metro' | 'carpool';

/** One way to make a trip differently, with its patch and its effects against the trip as it is. */
export interface TravelOption {
  readonly key: OptionKey;
  readonly patch: HouseholdPatch;
  readonly effects: readonly Effect[];
}

/** Modes a household owns or hires, where a shared mode cuts CO2 per person. */
export const PRIVATE_MODES: ReadonlySet<TravelMode> = new Set([
  'car',
  'taxi',
  'two_wheeler',
  'auto_rickshaw',
]);
const SHAREABLE: ReadonlySet<TravelMode> = new Set(['car', 'taxi']);
const SWAP_KINDS: ReadonlySet<ActivityKind> = new Set(['commute', 'school_run', 'errand', 'social', 'other']);

type Trip = Activity & { readonly travel: Travel };

function withEffects(
  s: Situation,
  trip: Trip,
  change: { key: OptionKey; patch: HouseholdPatch; after: Trip },
): TravelOption | null {
  const effects = effectsBetween(s, trip, change.after);
  return effects.length > 0 ? { key: change.key, patch: change.patch, effects } : null;
}

function modeOption(s: Situation, trip: Trip, mode: 'bus' | 'metro'): TravelOption | null {
  const patch: HouseholdPatch = { op: 'set_travel_mode', activityId: trip.id, mode, fuel: null };
  return withEffects(s, trip, {
    key: mode,
    patch,
    after: { ...trip, travel: { ...trip.travel, mode, fuel: null } },
  });
}

function carpoolOption(s: Situation, trip: Trip, occupancy: number): TravelOption | null {
  const patch: HouseholdPatch = { op: 'set_occupancy', activityId: trip.id, occupancy };
  return withEffects(s, trip, {
    key: 'carpool',
    patch,
    after: { ...trip, travel: { ...trip.travel, occupancy } },
  });
}

/**
 * The travel options for a trip: from a private vehicle on any day, the bus, the metro and, for a car with a
 * known occupancy, one more person; from a cycle on a poor or worse day, the bus and the metro. Work trips such
 * as a delivery shift get none. Options with no cited effect are dropped.
 */
export function travelOptions(s: Situation, activity: Activity): TravelOption[] {
  const travel = activity.travel;
  if (travel === null || !SWAP_KINDS.has(activity.kind)) {
    return [];
  }
  const trip: Trip = { ...activity, travel };
  const cycleOnBadDay = travel.mode === 'cycle' && bandAtLeast(s.ctx.band, 'poor');
  const modes: ('bus' | 'metro')[] = PRIVATE_MODES.has(travel.mode) || cycleOnBadDay ? ['bus', 'metro'] : [];
  const people = SHAREABLE.has(travel.mode) ? travel.occupancy : null;
  return [
    ...modes.map((mode) => modeOption(s, trip, mode)),
    people === null ? null : carpoolOption(s, trip, people + 1),
  ].filter((found) => found !== null);
}
