// Travel changes for one trip: the bus, the metro or one more person in the car, each with the effects code
// computed. The best becomes a swap item in the day plan; the others are its what-if toggles.
import type { Activity, ActivityKind, HouseholdPatch, Travel, TravelMode } from '../household/types.js';
import { minutesOf } from '../ledger/format.js';
import type { Effect } from '../ledger/types.js';
import { bandAtLeast, type Situation } from './context.js';
import { candidateFor, unique } from './draft.js';
import { effectsBetween } from './effects.js';
import { activityName, capitalise } from './text.js';
import type { CandidateAction, WhatIf } from './types.js';

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

const ACTION: Readonly<Record<OptionKey, string>> = {
  bus: 'take the bus',
  metro: 'take the metro',
  carpool: 'share the ride with one more person',
};

/** A what-if toggle for an option, citing every fact behind its effects. */
export function toggleFor(activity: Activity, choice: TravelOption): WhatIf {
  const factIds = unique(choice.effects.flatMap((effect) => effect.working.factIds)).slice(0, 12);
  return {
    id: `${choice.key}-${activity.id}`,
    label: capitalise(ACTION[choice.key]),
    patch: choice.patch,
    factIds,
  };
}

const WHY: Readonly<Record<OptionKey, string>> = {
  bus: 'A city bus carries many people, so each one accounts for less CO2 than in a private vehicle.',
  metro:
    'Inside a metro carriage the Delhi study measured cleaner air than outside. There is no verified CO2 figure for the metro, so none is shown.',
  carpool: 'Sharing the car splits its CO2 among more people.',
};

const WHY_OFF_THE_CYCLE =
  'On a bad air day a ride cuts what you breathe in on the way, since on a cycle you breathe much harder.';

function tradeOffFor(effects: readonly Effect[]): string | null {
  const co2Up = effects.some((effect) => effect.kind === 'co2' && effect.changeKg > 0);
  const breatheMore = effects.some((effect) => effect.kind === 'exposure' && effect.change.high > 0);
  if (co2Up) {
    return 'It adds CO2 that cycling does not, in exchange for breathing less on the way.';
  }
  return breatheMore
    ? 'You may breathe in more on the way than you do now; the working shows the range.'
    : null;
}

/** The swap item for a trip: the first option with a CO2 figure, or else the first option, with the rest as toggles. */
export function swapAction(s: Situation, activity: Activity): CandidateAction | null {
  const options = travelOptions(s, activity);
  const primary =
    options.find((choice) => choice.effects.some((effect) => effect.kind === 'co2')) ?? options[0];
  if (!primary) {
    return null;
  }
  const name = activityName(activity);
  const title = `${capitalise(name)}: ${ACTION[primary.key]}`;
  const why = activity.travel?.mode === 'cycle' ? WHY_OFF_THE_CYCLE : WHY[primary.key];
  const template = { title, why, tradeOff: tradeOffFor(primary.effects) };
  const whatIfs = options.filter((choice) => choice !== primary).map((choice) => toggleFor(activity, choice));
  const start = minutesOf(activity.start);
  return candidateFor(activity, {
    kind: 'swap_mode',
    prefix: 'swap',
    start,
    effects: primary.effects,
    factIds: [],
    template,
    whatIfs,
  });
}
