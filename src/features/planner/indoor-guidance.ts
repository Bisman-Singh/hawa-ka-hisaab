// Indoor guidance that needs no sizing: masks, wet mopping, one step per smoke source the household listed,
// and short corrections of beliefs the evidence does not support, in the plan's language.
import { isYoungChild } from '../household/members.js';
import type { IndoorSource } from '../household/types.js';
import { bandAtLeast, type Situation } from './context.js';
import type { IndoorStep } from './types.js';
import { say, type TextKey } from './words.js';

interface Guidance {
  readonly id: string;
  readonly topic: IndoorStep['topic'];
  readonly title: TextKey;
  readonly detail: TextKey;
  readonly factIds: readonly string[];
}

function step(s: Situation, guidance: Guidance, extra = ''): IndoorStep {
  return {
    id: guidance.id,
    topic: guidance.topic,
    title: say(s.lex, guidance.title),
    detail: `${say(s.lex, guidance.detail)}${extra}`,
    roomId: null,
    window: null,
    figure: null,
    factIds: [...guidance.factIds],
  };
}

const SOURCE_STEPS: Readonly<Record<IndoorSource, Guidance>> = {
  mosquito_coil: {
    id: 'source-mosquito-coil',
    topic: 'source_control',
    title: 'coil_title',
    detail: 'coil_detail',
    factIds: ['coil-cigarettes', 'coil-quote', 'advice-coils-incense'],
  },
  incense: {
    id: 'source-incense',
    topic: 'source_control',
    title: 'incense_title',
    detail: 'incense_detail',
    factIds: ['incense-quote', 'advice-coils-incense'],
  },
  smoking: {
    id: 'source-smoking',
    topic: 'source_control',
    title: 'smoking_title',
    detail: 'smoking_detail',
    factIds: ['advice-no-smoking'],
  },
  solid_fuel: {
    id: 'source-solid-fuel',
    topic: 'source_control',
    title: 'fuel_title',
    detail: 'fuel_detail',
    factIds: ['solid-fuel-quote', 'advice-clean-fuel'],
  },
};

const SMOKY_FUELS: ReadonlySet<string> = new Set(['biomass', 'coal', 'kerosene']);

function sources(s: Situation): IndoorStep[] {
  const home = s.ctx.household.home;
  const listed = new Set<IndoorSource>(home.indoorSources);
  if (SMOKY_FUELS.has(home.cookingFuel)) {
    listed.add('solid_fuel');
  }
  return [...listed].map((source) => step(s, SOURCE_STEPS[source]));
}

function mask(s: Situation): IndoorStep[] {
  const goesOut = s.ctx.household.activities.some(
    (activity) => activity.setting !== 'indoor' || activity.travel !== null,
  );
  if (!bandAtLeast(s.ctx.band, 'poor') || !goesOut) {
    return [];
  }
  const child = s.ctx.household.members.some(isYoungChild);
  const guidance: Guidance = {
    id: 'mask',
    topic: 'mask',
    title: 'mask_title',
    detail: 'mask_detail',
    factIds: [
      'advice-masks',
      'mask-filtration-quote',
      'mask-leakage-quote',
      'mask-cloth-quote',
      ...(child ? ['mask-children-quote'] : []),
    ],
  };
  return [step(s, guidance, child ? say(s.lex, 'mask_child') : '')];
}

const PLANTS: Guidance = {
  id: 'myth-plants',
  topic: 'myth',
  title: 'plants_title',
  detail: 'plants_detail',
  factIds: ['plants-quote'],
};
const CYCLING: Guidance = {
  id: 'myth-cycling',
  topic: 'myth',
  title: 'cycling_title',
  detail: 'cycling_detail',
  factIds: ['exposure-cycle-per-km', 'exposure-cycle-quote'],
};
const MOP: Guidance = {
  id: 'wet-mop',
  topic: 'wet_mopping',
  title: 'mop_title',
  detail: 'mop_detail',
  factIds: ['advice-wet-mopping'],
};

function myths(s: Situation): IndoorStep[] {
  const cycles = s.ctx.household.activities.some((activity) => activity.travel?.mode === 'cycle');
  const cycling = cycles && bandAtLeast(s.ctx.band, 'poor') ? [step(s, CYCLING)] : [];
  return [step(s, PLANTS), ...cycling];
}

/** Mask, wet mopping, source and myth steps for this household and day. A mild day gets sources and myths only. */
export function guidanceSteps(s: Situation): IndoorStep[] {
  const busy = s.dayKind === 'moderate' || s.dayKind === 'severe';
  return [...mask(s), ...(busy ? [step(s, MOP)] : []), ...sources(s), ...myths(s)];
}
