// "Instead of X, do Y" pairs tied to the household's own trips, fuel and smoke sources. Only a pair with a
// cited factor carries a number; the rest give the reason alone.
import type { Activity, TravelMode } from '../household/types.js';
import type { Situation } from './context.js';
import { coilPair, fuelPair } from './home-pairs.js';
import { activityName } from './text.js';
import { PRIVATE_MODES, travelOptions, type TravelOption } from './travel.js';
import type { Alternative } from './types.js';

const MODE_WORD: Readonly<Record<TravelMode, string>> = {
  walk: 'on foot',
  cycle: 'by cycle',
  bus: 'by bus',
  metro: 'by metro',
  suburban_rail: 'by suburban train',
  auto_rickshaw: 'by auto rickshaw',
  two_wheeler: 'by two-wheeler',
  car: 'by car',
  taxi: 'by taxi',
  school_bus: 'by school bus',
};

const DO_THIS: Readonly<Record<TravelOption['key'], string>> = {
  bus: 'take a city bus',
  metro: 'take the metro, if one runs your way',
  carpool: 'share the ride with one more person',
};

const REASON: Readonly<Record<TravelOption['key'], string>> = {
  bus: 'A bus carries many people, so each one accounts for less CO2.',
  metro: 'There is no verified CO2 figure for the metro, so none is shown.',
  carpool: 'The same car trip, split between more people.',
};

function travelPair(activity: Activity, mode: TravelMode, choice: TravelOption): Alternative {
  const effect = choice.effects.find((found) => found.kind === 'co2') ?? null;
  return {
    id: `alt-${choice.key}-${activity.id}`,
    activityId: activity.id,
    instead: `${activityName(activity)} ${MODE_WORD[mode]}`,
    doThis: DO_THIS[choice.key],
    reason: REASON[choice.key],
    effect,
    factIds: effect ? effect.working.factIds : [],
  };
}

function tripPairs(s: Situation, activity: Activity): Alternative[] {
  const mode = activity.travel?.mode;
  if (mode === undefined || !PRIVATE_MODES.has(mode)) {
    return [];
  }
  const schoolBus: Alternative[] =
    activity.kind === 'school_run'
      ? [
          {
            id: `alt-school-bus-${activity.id}`,
            activityId: activity.id,
            instead: `${activityName(activity)} ${MODE_WORD[mode]}`,
            doThis: 'use the school bus or share the school run',
            reason:
              'One vehicle carrying many children replaces several car trips. There is no verified CO2 figure for school buses, so none is shown.',
            effect: null,
            factIds: [],
          },
        ]
      : [];
  return [...travelOptions(s, activity).map((choice) => travelPair(activity, mode, choice)), ...schoolBus];
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
          instead: 'separate errand trips',
          doThis: 'make one trip that covers them all',
          reason: 'Fewer trips mean fewer km driven. The saving depends on the route, so no figure is shown.',
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
