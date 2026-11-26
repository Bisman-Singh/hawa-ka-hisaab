// Which community actions apply, in rank order. Each rule reads only the inputs, the band, the timing and
// whether the place is in Delhi NCR, so a mild day can never pick up a restriction by accident.
import type { GrapNotice } from '../air/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { Timing } from './timing.js';
import type { CommunityInput } from './types.js';

function ids<const T extends readonly string[]>(values: T): T {
  return values;
}

/** Every action id in rank order: health advice first, then the day's steps, then sources, then GRAP. */
export const ACTION_IDS = ids([
  'health-advice',
  'normal-day',
  'check-reading',
  'assembly-indoors',
  'outdoor-indoors',
  'outdoor-move',
  'outdoor-light',
  'windows',
  'wet-mopping',
  'masks',
  'outdoor-staff',
  'no-idling',
  'stop-waste-burning',
  'generator-essential',
  'grap-stage',
  'grap-sports',
]);

/** A community action id. */
export type ActionId = (typeof ACTION_IDS)[number];

/** How strict the day is. high starts at Poor, where the advisory keeps children indoors and windows shut. */
export type Level = 'mild' | 'moderate' | 'high' | 'unknown';

const LEVEL_BY_BAND: Readonly<Record<AqiBand, Level>> = {
  good: 'mild',
  satisfactory: 'mild',
  moderate: 'moderate',
  poor: 'high',
  very_poor: 'high',
  severe: 'high',
};

/** Everything the rules look at. month is the IST calendar month of the notice. */
export interface Situation {
  readonly community: CommunityInput;
  readonly band: AqiBand | null;
  readonly timing: Timing;
  readonly grap: GrapNotice | null;
  readonly month: number;
}

/** The level for a band, or unknown without one. */
export function levelOf(band: AqiBand | null): Level {
  return band === null ? 'unknown' : LEVEL_BY_BAND[band];
}

/** True when vehicles wait at the gate with engines running. */
export function idlesAtGate(community: CommunityInput): boolean {
  const gate = community.gateIdling;
  return gate !== null && gate.vehiclesPerDay > 0 && gate.idleMinutes > 0;
}

/** True when a generator runs that the cited DG set share covers: diesel or fuel not given, never gas. */
export function runsDgSet(community: CommunityInput): boolean {
  const generator = community.generator;
  return generator !== null && generator.hoursPerDay > 0 && generator.fuel !== 'gas';
}

const high = (s: Situation): boolean => levelOf(s.band) === 'high';
const moderate = (s: Situation): boolean => levelOf(s.band) === 'moderate';
const notMild = (s: Situation): boolean => high(s) || moderate(s);
const hasPeriods = (s: Situation): boolean => s.community.outdoorPeriods.length > 0;
const sportsSeason = (s: Situation): boolean =>
  s.community.kind === 'school' && s.grap !== null && s.month >= 11;

const RULES: Readonly<Record<ActionId, (s: Situation) => boolean>> = {
  'health-advice': (s) => s.band !== null,
  'normal-day': (s) => levelOf(s.band) === 'mild',
  'check-reading': (s) => s.band === null,
  'assembly-indoors': (s) => high(s) && s.community.assembly !== null,
  'outdoor-indoors': (s) => high(s) && hasPeriods(s),
  'outdoor-move': (s) => moderate(s) && s.timing.periods.some((period) => period.worse === true),
  'outdoor-light': (s) => moderate(s) && hasPeriods(s),
  windows: high,
  'wet-mopping': notMild,
  masks: high,
  'outdoor-staff': (s) => high(s) && (s.community.outdoorStaff ?? 0) > 0,
  'no-idling': (s) => notMild(s) && idlesAtGate(s.community),
  'stop-waste-burning': (s) => s.community.wasteBurning !== 'never',
  'generator-essential': (s) => notMild(s) && runsDgSet(s.community),
  'grap-stage': (s) => s.grap !== null && s.grap.stage !== 'none',
  'grap-sports': (s) => notMild(s) && sportsSeason(s),
};

/** The actions that apply, in rank order. */
export function selectActions(situation: Situation): ActionId[] {
  return ACTION_IDS.filter((id) => RULES[id](situation));
}
