// "Instead of X, do Y" pairs tied to the household's own trips, errands, cooking fuel and mosquito coil, in the plan's
// language. Only a pair with a cited factor carries a number; the rest give the reason alone.
import type { Activity, TravelMode } from '../household/types.js';
import { isSmokyFuel, type Situation } from './context.js';
import { namesIn } from './text.js';
import { PRIVATE_MODES, travelOptions, type TravelOption } from './travel.js';
import type { Alternative } from './types.js';
import { say } from './words.js';

/** The pairs that carry no number: their reason words are named by the stem, such as alt_why_coil. */
type ReasonOnly = 'school_bus' | 'errands' | 'fuel' | 'coil';

interface PairOf {
  readonly id: string;
  readonly instead: string;
  readonly activityId?: string;
  readonly factIds?: readonly string[];
}

function reasonOnly(s: Situation, stem: ReasonOnly, pair: PairOf): Alternative {
  return {
    id: pair.id,
    activityId: pair.activityId ?? null,
    instead: pair.instead,
    doThis: say(s.lex, `alt_do_${stem}`),
    reason: say(s.lex, `alt_why_${stem}`),
    effect: null,
    factIds: [...(pair.factIds ?? [])],
  };
}

function tripName(s: Situation, activity: Activity, mode: TravelMode): string {
  return say(s.lex, 'alt_trip', { name: namesIn(s, activity).name, mode: s.lex.mode[mode] });
}

function travelPair(
  s: Situation,
  trip: { activity: Activity; mode: TravelMode },
  choice: TravelOption,
): Alternative {
  const { activity, mode } = trip;
  const effect = choice.effects.find((found) => found.kind === 'co2') ?? null;
  return {
    id: `alt-${choice.key}-${activity.id}`,
    activityId: activity.id,
    instead: tripName(s, activity, mode),
    doThis: say(s.lex, `alt_do_${choice.key}`),
    reason: say(s.lex, `alt_why_${choice.key}`),
    effect,
    factIds: effect ? effect.working.factIds : [],
  };
}

function tripPairs(s: Situation, activity: Activity): Alternative[] {
  const mode = activity.travel?.mode;
  if (mode === undefined || !PRIVATE_MODES.has(mode)) {
    return [];
  }
  const bus = {
    id: `alt-school-bus-${activity.id}`,
    activityId: activity.id,
    instead: tripName(s, activity, mode),
  };
  return [
    ...travelOptions(s, activity).map((choice) => travelPair(s, { activity, mode }, choice)),
    ...(activity.kind === 'school_run' ? [reasonOnly(s, 'school_bus', bus)] : []),
  ];
}

function homePairs(s: Situation): Alternative[] {
  const { activities, home } = s.ctx.household;
  const driven = activities.filter(
    (activity) =>
      activity.kind === 'errand' && activity.travel !== null && PRIVATE_MODES.has(activity.travel.mode),
  );
  const fuel = home.cookingFuel;
  const pairs: (Alternative | false)[] = [
    driven.length >= 2 &&
      reasonOnly(s, 'errands', { id: 'alt-combine-errands', instead: say(s.lex, 'alt_errands') }),
    isSmokyFuel(fuel) &&
      reasonOnly(s, 'fuel', {
        id: 'alt-cooking-fuel',
        instead: say(s.lex, 'alt_fuel', { fuel: s.lex.fuel[fuel] }),
        factIds: ['advice-clean-fuel', 'solid-fuel-quote'],
      }),
    home.indoorSources.includes('mosquito_coil') &&
      reasonOnly(s, 'coil', {
        id: 'alt-mosquito-coil',
        instead: say(s.lex, 'alt_coil'),
        factIds: ['coil-cigarettes', 'coil-quote', 'advice-coils-incense'],
      }),
  ];
  return pairs.filter((pair) => pair !== false);
}

/** Every pair for the household, trips first, at most twelve. */
export function alternativesFor(s: Situation): Alternative[] {
  return [...s.ctx.household.activities.flatMap((activity) => tripPairs(s, activity)), ...homePairs(s)].slice(
    0,
    12,
  );
}
