// Indoor guidance that needs no sizing: masks, wet mopping, one step per smoke source the household listed,
// and short corrections of beliefs the evidence does not support, in the plan's language.
import { isYoungChild } from '../household/members.js';
import type { IndoorSource } from '../household/types.js';
import { bandAtLeast, isSmokyFuel, type Situation } from './context.js';
import type { IndoorStep } from './types.js';
import { say } from './words.js';

/** The guidance whose words are named by a stem, such as coil_title and coil_detail. */
type Stem = 'coil' | 'incense' | 'smoking' | 'fuel' | 'mask' | 'plants' | 'cycling' | 'mop';

interface Guidance {
  readonly id: string;
  readonly topic: IndoorStep['topic'];
  readonly stem: Stem;
  readonly factIds: readonly string[];
}

const TOPIC: Readonly<Record<Stem, IndoorStep['topic']>> = {
  coil: 'source_control',
  incense: 'source_control',
  smoking: 'source_control',
  fuel: 'source_control',
  mask: 'mask',
  plants: 'myth',
  cycling: 'myth',
  mop: 'wet_mopping',
};

const guide = (id: string, stem: Stem, factIds: readonly string[]): Guidance => ({
  id,
  topic: TOPIC[stem],
  stem,
  factIds,
});

function step(s: Situation, guidance: Guidance, extra = ''): IndoorStep {
  return {
    id: guidance.id,
    topic: guidance.topic,
    title: say(s.lex, `${guidance.stem}_title`),
    detail: `${say(s.lex, `${guidance.stem}_detail`)}${extra}`,
    roomId: null,
    window: null,
    figure: null,
    factIds: [...guidance.factIds],
  };
}

const SOURCE_STEPS: Readonly<Record<IndoorSource, Guidance>> = {
  mosquito_coil: guide('source-mosquito-coil', 'coil', [
    'coil-cigarettes',
    'coil-quote',
    'advice-coils-incense',
  ]),
  incense: guide('source-incense', 'incense', ['incense-quote', 'advice-coils-incense']),
  smoking: guide('source-smoking', 'smoking', ['advice-no-smoking']),
  solid_fuel: guide('source-solid-fuel', 'fuel', ['solid-fuel-quote', 'advice-clean-fuel']),
};

function sources(s: Situation): IndoorStep[] {
  const home = s.ctx.household.home;
  const listed = new Set<IndoorSource>(home.indoorSources);
  if (isSmokyFuel(home.cookingFuel)) {
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
  const masks = ['advice-masks', 'mask-filtration-quote', 'mask-leakage-quote', 'mask-cloth-quote'];
  const guidance = guide('mask', 'mask', [...masks, ...(child ? ['mask-children-quote'] : [])]);
  return [step(s, guidance, child ? say(s.lex, 'mask_child') : '')];
}

const PLANTS = guide('myth-plants', 'plants', ['plants-quote']);
const CYCLING = guide('myth-cycling', 'cycling', ['exposure-cycle-per-km', 'exposure-cycle-quote']);
const MOP = guide('wet-mop', 'mop', ['advice-wet-mopping']);

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
