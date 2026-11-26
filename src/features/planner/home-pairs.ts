// "Instead of X, do Y" pairs for the home: a cleaner cooking fuel and a mosquito coil alternative, reason only.
import type { Situation } from './context.js';
import type { Alternative } from './types.js';

const SMOKY_FUELS: ReadonlySet<string> = new Set(['biomass', 'coal', 'kerosene']);

/** Cooking on gas or electricity in place of a smoky fuel, when the household cooks on one. */
export function fuelPair(s: Situation): Alternative[] {
  const fuel = s.ctx.household.home.cookingFuel;
  if (!SMOKY_FUELS.has(fuel)) {
    return [];
  }
  return [
    {
      id: 'alt-cooking-fuel',
      activityId: null,
      instead: `cooking on ${fuel}`,
      doThis: 'cook on LPG, piped gas or induction',
      reason:
        'The health ministry advises clean smokeless fuels such as gas or electricity for cooking and heating.',
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
      instead: 'a mosquito coil at night',
      doThis: 'use a bed net or a repellent that does not burn',
      reason: 'One coil gives off as much fine particle mass as 75 to 137 cigarettes.',
      effect: null,
      factIds: ['coil-cigarettes', 'coil-quote', 'advice-coils-incense'],
    },
  ];
}
