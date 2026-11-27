// "Instead of X, do Y" pairs for the home: a cleaner cooking fuel and a mosquito coil alternative, reason only.
import type { Situation } from './context.js';
import type { Alternative } from './types.js';
import { say } from './words.js';
import type { SmokyFuel } from './words-lexicon.js';

const SMOKY_FUELS: ReadonlySet<string> = new Set<SmokyFuel>(['biomass', 'coal', 'kerosene']);

const isSmoky = (fuel: string): fuel is SmokyFuel => SMOKY_FUELS.has(fuel);

/** Cooking on gas or electricity in place of a smoky fuel, when the household cooks on one. */
export function fuelPair(s: Situation): Alternative[] {
  const fuel = s.ctx.household.home.cookingFuel;
  if (!isSmoky(fuel)) {
    return [];
  }
  return [
    {
      id: 'alt-cooking-fuel',
      activityId: null,
      instead: say(s.lex, 'alt_fuel', { fuel: s.lex.fuel[fuel] }),
      doThis: say(s.lex, 'alt_do_fuel'),
      reason: say(s.lex, 'alt_why_fuel'),
      effect: null,
      factIds: ['advice-clean-fuel', 'solid-fuel-quote'],
    },
  ];
}

/** A net or a repellent that does not burn in place of a mosquito coil, when the household burns one. */
export function coilPair(s: Situation): Alternative[] {
  if (!s.ctx.household.home.indoorSources.includes('mosquito_coil')) {
    return [];
  }
  return [
    {
      id: 'alt-mosquito-coil',
      activityId: null,
      instead: say(s.lex, 'alt_coil'),
      doThis: say(s.lex, 'alt_do_coil'),
      reason: say(s.lex, 'alt_why_coil'),
      effect: null,
      factIds: ['coil-cigarettes', 'coil-quote', 'advice-coils-incense'],
    },
  ];
}
