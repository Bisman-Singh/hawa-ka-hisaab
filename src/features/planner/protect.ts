// Protection for an activity that stays where it is: a light pace for effort, a fitted N95 on poor or worse
// days, recirculated air in a car, and plain words about children and masks.
import { isYoungChild, membersOf } from '../household/members.js';
import type { Activity, ActivityKind, TravelMode } from '../household/types.js';
import { minutesOf } from '../ledger/format.js';
import { lightPaceEffect, maskEffect } from '../ledger/protection.js';
import type { Effect } from '../ledger/types.js';
import type { AqiBand } from '../naqi/types.js';
import { bandAtLeast, vulnerableAmong, type Situation } from './context.js';
import { candidateFor } from './draft.js';
import { activityName, adviceFor, airToday, capitalise } from './text.js';
import type { CandidateAction } from './types.js';

const EFFORT_KINDS: ReadonlySet<ActivityKind> = new Set(['outdoor_exercise', 'outdoor_play']);
const EFFORT_MODES: ReadonlySet<TravelMode> = new Set(['walk', 'cycle']);
const CAR_MODES: ReadonlySet<TravelMode> = new Set(['car', 'taxi']);

const CAR_NOTE = {
  text: 'In the car, keep the windows up and the AC on recirculate.',
  factId: 'advice-ac-recirculate',
};
const CHILD_NOTE = {
  text: 'No study measured how well masks protect children, so keep their time outside short.',
  factId: 'mask-children-quote',
};

function isEffort(activity: Activity): boolean {
  return (
    EFFORT_KINDS.has(activity.kind) || (activity.travel !== null && EFFORT_MODES.has(activity.travel.mode))
  );
}

function notes(s: Situation, activity: Activity, band: AqiBand): { text: string; factId: string }[] {
  if (!bandAtLeast(band, 'poor')) {
    return [];
  }
  const inCar = activity.travel !== null && CAR_MODES.has(activity.travel.mode);
  const child = membersOf(s.ctx.household, activity.memberIds).some(isYoungChild);
  return [...(inCar ? [CAR_NOTE] : []), ...(child ? [CHILD_NOTE] : [])];
}

function effects(
  s: Situation,
  activity: Activity,
  band: AqiBand,
): { pace: Effect | null; mask: Effect | null } {
  const members = membersOf(s.ctx.household, activity.memberIds);
  return {
    pace: isEffort(activity) ? lightPaceEffect(members) : null,
    mask: bandAtLeast(band, 'poor') ? maskEffect(members) : null,
  };
}

function title(activity: Activity, found: { pace: Effect | null; mask: Effect | null }): string {
  const parts = [found.pace ? 'go at a light pace' : '', found.mask ? 'wear a well fitted N95' : ''];
  const said = parts.filter((part) => part !== '').join(' and ');
  return `${capitalise(activityName(activity))}: ${said === '' ? 'keep it short' : said}`;
}

/**
 * Protection for an activity kept in place, or null when there is nothing to add: no effort, a band better than
 * poor, and no vulnerable member on a severe day.
 */
export function protect(s: Situation, activity: Activity, band: AqiBand): CandidateAction | null {
  const found = effects(s, activity, band);
  const atRisk = s.dayKind === 'severe' && vulnerableAmong(s, activity.memberIds).length > 0;
  if (!found.pace && !found.mask && !atRisk) {
    return null;
  }
  const advice = adviceFor(band, membersOf(s.ctx.household, activity.memberIds));
  const extra = notes(s, activity, band);
  const why = [airToday(band), advice.text, ...extra.map((note) => note.text)].filter((line) => line !== '');
  return candidateFor(activity, {
    kind: 'protect',
    prefix: 'protect',
    start: minutesOf(activity.start),
    effects: [found.pace, found.mask].filter((effect) => effect !== null),
    factIds: [...advice.factIds, ...extra.map((note) => note.factId)],
    template: { title: title(activity, found), why: why.join(' '), tradeOff: null },
    whatIfs: [],
  });
}
