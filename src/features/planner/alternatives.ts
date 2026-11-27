// "Instead of X, do Y" pairs tied to the household's own trips, fuel and smoke sources, in the plan's language.
// Only a pair with a cited factor carries a number; the rest give the reason alone.
import type { Activity, TravelMode } from '../household/types.js';
import type { Situation } from './context.js';
import { coilPair, fuelPair } from './home-pairs.js';
import { namesIn } from './text.js';
import { PRIVATE_MODES, travelOptions, type TravelOption } from './travel.js';
import type { Alternative } from './types.js';
import { say, type TextKey } from './words.js';

const DO_THIS: Readonly<Record<TravelOption['key'], TextKey>> = {
  bus: 'alt_do_bus',
  metro: 'alt_do_metro',
  carpool: 'alt_do_carpool',
};

const REASON: Readonly<Record<TravelOption['key'], TextKey>> = {
  bus: 'alt_why_bus',
  metro: 'alt_why_metro',
  carpool: 'alt_why_carpool',
};

function tripName(s: Situation, activity: Activity, mode: TravelMode): string {
  return say(s.lex, 'alt_trip', { name: namesIn(s, activity).name, mode: s.lex.mode[mode] });
}

function travelPair(
  s: Situation,
  trip: { activity: Activity; mode: TravelMode },
  choice: TravelOption,
): Alternative {
  const effect = choice.effects.find((found) => found.kind === 'co2') ?? null;
  const { activity, mode } = trip;
  return {
    id: `alt-${choice.key}-${activity.id}`,
    activityId: activity.id,
    instead: tripName(s, activity, mode),
    doThis: say(s.lex, DO_THIS[choice.key]),
    reason: say(s.lex, REASON[choice.key]),
    effect,
    factIds: effect ? effect.working.factIds : [],
  };
}

function schoolBus(s: Situation, activity: Activity, mode: TravelMode): Alternative[] {
  return activity.kind === 'school_run'
    ? [
        {
          id: `alt-school-bus-${activity.id}`,
          activityId: activity.id,
          instead: tripName(s, activity, mode),
          doThis: say(s.lex, 'alt_do_school_bus'),
          reason: say(s.lex, 'alt_why_school_bus'),
          effect: null,
          factIds: [],
        },
      ]
    : [];
}

function tripPairs(s: Situation, activity: Activity): Alternative[] {
  const mode = activity.travel?.mode;
  if (mode === undefined || !PRIVATE_MODES.has(mode)) {
    return [];
  }
  return [
    ...travelOptions(s, activity).map((choice) => travelPair(s, { activity, mode }, choice)),
    ...schoolBus(s, activity, mode),
  ];
}

function combinedErrands(s: Situation): Alternative[] {
  const driven = s.ctx.household.activities.filter(
    (activity) =>
      activity.kind === 'errand' && activity.travel !== null && PRIVATE_MODES.has(activity.travel.mode),
  );
  return driven.length < 2
    ? []
    : [
        {
          id: 'alt-combine-errands',
          activityId: null,
          instead: say(s.lex, 'alt_errands'),
          doThis: say(s.lex, 'alt_do_errands'),
          reason: say(s.lex, 'alt_why_errands'),
          effect: null,
          factIds: [],
        },
      ];
}

/** Every pair for the household, trips first, at most twelve. */
export function alternativesFor(s: Situation): Alternative[] {
  return [
    ...s.ctx.household.activities.flatMap((activity) => tripPairs(s, activity)),
    ...combinedErrands(s),
    ...fuelPair(s),
    ...coilPair(s),
  ].slice(0, 12);
}
