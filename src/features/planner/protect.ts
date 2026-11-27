// Protection for an activity that stays where it is: a light pace for effort, a closed car with the AC on, a
// fitted N95 on poor or worse days, breaks away from traffic for outdoor work, and plain words about children.
import { isYoungChild, membersOf } from '../household/members.js';
import type { Activity, ActivityKind, Member, TravelMode } from '../household/types.js';
import { minutesOf } from '../ledger/format.js';
import { closedCarEffect, lightPaceEffect, maskEffect } from '../ledger/protection.js';
import type { Effect } from '../ledger/types.js';
import type { AqiBand } from '../naqi/types.js';
import { bandAtLeast, vulnerableAmong, type Situation } from './context.js';
import { candidateFor } from './draft.js';
import { adviceFor, airToday, namesIn } from './text.js';
import type { CandidateAction } from './types.js';
import { say, type TextKey } from './words.js';

const EFFORT_KINDS: ReadonlySet<ActivityKind> = new Set(['outdoor_exercise', 'outdoor_play']);
const EFFORT_MODES: ReadonlySet<TravelMode> = new Set(['walk', 'cycle']);
const CAR_MODES: ReadonlySet<TravelMode> = new Set(['car', 'taxi']);
/** A mask is for short spells; past this many minutes outside the plan says to take breaks and replace it. */
export const LONG_SPELL_MINUTES = 120;

interface Note {
  readonly key: TextKey;
  readonly factIds: readonly string[];
}

interface Found {
  readonly pace: Effect | null;
  readonly mask: Effect | null;
  readonly car: Effect | null;
  readonly worker: boolean;
  readonly members: readonly Member[];
}

const isEffort = (activity: Activity): boolean =>
  EFFORT_KINDS.has(activity.kind) || (activity.travel !== null && EFFORT_MODES.has(activity.travel.mode));

const inCar = (activity: Activity): boolean =>
  activity.travel !== null && CAR_MODES.has(activity.travel.mode);
const onTwoWheeler = (activity: Activity): boolean => activity.travel?.mode === 'two_wheeler';

function find(s: Situation, activity: Activity, band: AqiBand): Found {
  const members = membersOf(s.ctx.household, activity.memberIds);
  return {
    pace: isEffort(activity) ? lightPaceEffect(members) : null,
    mask: bandAtLeast(band, 'poor') && !inCar(activity) ? maskEffect(members) : null,
    car: inCar(activity) ? closedCarEffect(activity.memberIds) : null,
    worker: activity.kind === 'outdoor_work' && vulnerableAmong(s, activity.memberIds).length > 0,
    members,
  };
}

function notes(activity: Activity, band: AqiBand, found: Found): Note[] {
  const all: (Note | false)[] = [
    found.car !== null && { key: 'note_car', factIds: ['advice-ac-recirculate'] },
    found.worker && onTwoWheeler(activity) && { key: 'note_road', factIds: ['exposure-onroad-quote'] },
    found.mask !== null &&
      activity.durationMinutes >= LONG_SPELL_MINUTES && { key: 'note_long_mask', factIds: ['advice-masks'] },
    bandAtLeast(band, 'poor') &&
      found.members.some(isYoungChild) && { key: 'note_child', factIds: ['mask-children-quote'] },
  ];
  return all.filter((note) => note !== false);
}

function titleParts(activity: Activity, found: Found): TextKey[] {
  const worker: TextKey = onTwoWheeler(activity) ? 'protect_breaks' : 'protect_ease';
  const parts: (TextKey | false)[] = [
    found.pace !== null && 'protect_pace',
    found.car !== null && 'protect_closed_car',
    found.mask !== null && 'protect_mask',
    found.worker && worker,
  ];
  const chosen = parts.filter((part) => part !== false);
  return chosen.length > 0 ? chosen : ['protect_short'];
}

/** The band's advice when the step is about effort or people at risk; a closed car alone needs none. */
function adviceIfExertion(s: Situation, found: Found, atRisk: boolean): { text: string; factIds: string[] } {
  const exertion = found.pace !== null || found.mask !== null || found.worker || atRisk;
  return exertion ? adviceFor(s, found.members) : { text: '', factIds: [] };
}

/**
 * Protection for an activity kept in place, or null when there is nothing to add: no effort, no car, no outdoor
 * work by someone the advisory counts as vulnerable, a band better than poor, and no vulnerable member on a
 * severe day.
 */
export function protect(s: Situation, activity: Activity, band: AqiBand): CandidateAction | null {
  const found = find(s, activity, band);
  const atRisk = s.dayKind === 'severe' && vulnerableAmong(s, activity.memberIds).length > 0;
  const effects = [found.pace, found.car, found.mask].filter((effect) => effect !== null);
  if (effects.length === 0 && !found.worker && !atRisk) {
    return null;
  }
  const advice = adviceIfExertion(s, found, atRisk);
  const extra = notes(activity, band, found);
  const why = [airToday(s, band), advice.text, ...extra.map((note) => say(s.lex, note.key))];
  const parts = titleParts(activity, found).map((key) => say(s.lex, key));
  return candidateFor(activity, {
    kind: 'protect',
    prefix: 'protect',
    start: minutesOf(activity.start),
    effects,
    factIds: [...advice.factIds, ...extra.flatMap((note) => note.factIds)],
    template: {
      title: say(s.lex, 'protect_title', {
        ...namesIn(s, activity),
        parts: parts.join(say(s.lex, 'protect_and')),
      }),
      why: why.filter((line) => line !== '').join(' '),
      tradeOff: null,
    },
    whatIfs: [],
  });
}
