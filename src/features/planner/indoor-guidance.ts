// Indoor guidance that needs no sizing: masks, wet mopping, one step per smoke source the household listed,
// and short corrections of beliefs the evidence does not support.
import { isYoungChild } from '../household/members.js';
import type { IndoorSource } from '../household/types.js';
import { bandAtLeast, type Situation } from './context.js';
import type { IndoorStep } from './types.js';

type Guidance = Pick<IndoorStep, 'id' | 'topic' | 'title' | 'detail' | 'factIds'>;

function step(guidance: Guidance): IndoorStep {
  return { ...guidance, roomId: null, window: null, figure: null };
}

const SOURCE_STEPS: Readonly<Record<IndoorSource, Guidance>> = {
  mosquito_coil: {
    id: 'source-mosquito-coil',
    topic: 'source_control',
    title: 'Do not burn a mosquito coil in a closed room',
    detail:
      'One coil gives off as much fine particle mass as 75 to 137 cigarettes. A bed net or a repellent that does not burn keeps the smoke out.',
    factIds: ['coil-cigarettes', 'coil-quote', 'advice-coils-incense'],
  },
  incense: {
    id: 'source-incense',
    topic: 'source_control',
    title: 'Keep incense out of closed rooms',
    detail:
      'Burning incense gives off fine particles. The health ministry advises against burning incense sticks in closed rooms.',
    factIds: ['incense-quote', 'advice-coils-incense'],
  },
  smoking: {
    id: 'source-smoking',
    topic: 'source_control',
    title: 'Keep smoking out of the home',
    detail: 'The health ministry advises not to smoke cigarettes, bidis or other tobacco.',
    factIds: ['advice-no-smoking'],
  },
  solid_fuel: {
    id: 'source-solid-fuel',
    topic: 'source_control',
    title: 'Cook and heat with gas or electricity where you can',
    detail:
      'Indian homes that cook with solid fuel measured a day average of 163 µg/m³ of PM2.5 in the living area and 609 in the kitchen. The health ministry advises gas or electricity, and a clean cook stove if you must burn biomass.',
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
  return [...listed].map((source) => step(SOURCE_STEPS[source]));
}

function mask(s: Situation): IndoorStep[] {
  const goesOut = s.ctx.household.activities.some(
    (activity) => activity.setting !== 'indoor' || activity.travel !== null,
  );
  if (!bandAtLeast(s.ctx.band, 'poor') || !goesOut) {
    return [];
  }
  const child = s.ctx.household.members.some(isYoungChild);
  return [
    step({
      id: 'mask',
      topic: 'mask',
      title: 'Masks: a well fitted N95 or N99, for short spells outside',
      detail: `The health ministry says paper masks, handkerchiefs, scarves and cloth are not effective, and an N95 or N99 helps only when it fits well over mouth and nose.${child ? ' No study measured how well masks protect children; the one study found looked only at whether children could wear them.' : ''}`,
      factIds: [
        'advice-masks',
        'mask-filtration-quote',
        'mask-leakage-quote',
        'mask-cloth-quote',
        ...(child ? ['mask-children-quote'] : []),
      ],
    }),
  ];
}

function myths(s: Situation): IndoorStep[] {
  const cycles = s.ctx.household.activities.some((activity) => activity.travel?.mode === 'cycle');
  const plants = step({
    id: 'myth-plants',
    topic: 'myth',
    title: 'Houseplants will not clean smoky air',
    detail:
      'A review found it would take 10 to 1000 plants per square metre of floor to match the air a home already exchanges, and that work was on gases, not smoke particles.',
    factIds: ['plants-quote'],
  });
  const cycling = step({
    id: 'myth-cycling',
    topic: 'myth',
    title: 'Cycling is not the low exposure choice on a bad day',
    detail:
      'Counting breathing and speed, the Delhi study found cycling takes in 9 times as much PM2.5 per km as an air-conditioned car.',
    factIds: ['exposure-cycle-per-km', 'exposure-cycle-quote'],
  });
  return [plants, ...(cycles && bandAtLeast(s.ctx.band, 'poor') ? [cycling] : [])];
}

/** Mask, wet mopping, source and myth steps for this household and day. A mild day gets sources and myths only. */
export function guidanceSteps(s: Situation): IndoorStep[] {
  const busy = s.dayKind === 'moderate' || s.dayKind === 'severe';
  const mop = step({
    id: 'wet-mop',
    topic: 'wet_mopping',
    title: 'Wet mop instead of sweeping',
    detail:
      'The health ministry advises wet mopping instead of sweeping or vacuuming inside homes, to reduce exposure.',
    factIds: ['advice-wet-mopping'],
  });
  return [...mask(s), ...(busy ? [mop] : []), ...sources(s), ...myths(s)];
}
