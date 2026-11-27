// The swap item for a trip: the travel option with a CO2 figure first, the others as its toggles, why it helps,
// what it costs, and what to add when a missing distance or rider count is why there is no CO2 figure.
import type { Activity, Travel } from '../household/types.js';
import { changeInWords } from '../ledger/display.js';
import { minutesOf } from '../ledger/format.js';
import type { Effect } from '../ledger/types.js';
import type { Situation } from './context.js';
import { candidateFor, unique } from './draft.js';
import { namesIn } from './text.js';
import { PRIVATE_MODES, travelOptions, type OptionKey, type TravelOption } from './travel.js';
import type { CandidateAction, WhatIf } from './types.js';
import { say, type TextKey } from './words.js';

const ACTION: Readonly<Record<OptionKey, TextKey>> = {
  bus: 'swap_bus',
  metro: 'swap_metro',
  carpool: 'swap_carpool',
};
const TOGGLE: Readonly<Record<OptionKey, TextKey>> = {
  bus: 'toggle_bus',
  metro: 'toggle_metro',
  carpool: 'toggle_carpool',
};
const WHY: Readonly<Record<OptionKey, TextKey>> = {
  bus: 'swap_why_bus',
  metro: 'swap_why_metro',
  carpool: 'swap_why_carpool',
};

/** A what-if toggle for an option, citing every fact behind its effects. */
export function toggleFor(s: Situation, activity: Activity, choice: TravelOption): WhatIf {
  const factIds = unique(choice.effects.flatMap((effect) => effect.working.factIds)).slice(0, 12);
  return {
    id: `${choice.key}-${activity.id}`,
    label: say(s.lex, TOGGLE[choice.key]),
    patch: choice.patch,
    factIds,
  };
}

/**
 * The trade-off of a swap in plain words: CO2 it adds, or more breathed in on the way. A range that could be a cut
 * or a rise names both ends; a rise is never worded as a cut.
 */
export function swapTradeOff(s: Situation, effects: readonly Effect[]): string | null {
  if (effects.some((effect) => effect.kind === 'co2' && effect.changeKg > 0)) {
    return say(s.lex, 'swap_trade_co2');
  }
  const breathing = effects.find((effect) => effect.kind === 'exposure' && effect.change.high > 0);
  if (breathing?.kind !== 'exposure') {
    return null;
  }
  const words = (change: number): string => changeInWords(change, s.lex.language);
  const { low, high } = breathing.change;
  return low < 0
    ? say(s.lex, 'swap_trade_mixed', { high: words(high), low: words(low) })
    : say(s.lex, 'swap_trade_more', { change: words(high) });
}

/** What to add to see a CO2 figure for this trip, when a figure is missing for that reason only. */
function missingFigure(s: Situation, travel: Travel, effects: readonly Effect[]): string | null {
  const known = effects.some((effect) => effect.kind === 'co2') || travel.fuel === 'electric';
  if (known || !PRIVATE_MODES.has(travel.mode)) {
    return null;
  }
  if (travel.distanceKm === null) {
    return say(s.lex, 'swap_add_distance');
  }
  return travel.occupancy === null ? say(s.lex, 'swap_add_riders') : null;
}

/** The swap item for a trip: the first option with a CO2 figure, or else the first option, with the rest as toggles. */
export function swapAction(s: Situation, activity: Activity): CandidateAction | null {
  const options = travelOptions(s, activity);
  const primary =
    options.find((choice) => choice.effects.some((effect) => effect.kind === 'co2')) ?? options[0];
  const travel = activity.travel;
  if (travel === null || !primary) {
    return null;
  }
  const names = namesIn(s, activity);
  const reason = say(s.lex, travel.mode === 'cycle' ? 'swap_why_cycle' : WHY[primary.key]);
  const missing = missingFigure(s, travel, primary.effects);
  const template = {
    title: say(s.lex, 'swap_title', { ...names, action: say(s.lex, ACTION[primary.key]) }),
    why: missing === null ? reason : `${reason} ${missing}`,
    tradeOff: swapTradeOff(s, primary.effects),
  };
  const whatIfs = options
    .filter((choice) => choice !== primary)
    .map((choice) => toggleFor(s, activity, choice));
  return candidateFor(activity, {
    kind: 'swap_mode',
    prefix: 'swap',
    start: minutesOf(activity.start),
    effects: primary.effects,
    factIds: [],
    template,
    whatIfs,
  });
}
