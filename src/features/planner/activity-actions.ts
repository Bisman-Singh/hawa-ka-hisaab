// Candidate actions for one activity: say it is fine, keep it indoors, move it to cleaner hours, or protect it.
// A mild or unknown day only ever gets the first. Order is preference: the rules path takes the first.
import { membersOf } from '../household/members.js';
import { protect } from './protect.js';
import type { Activity, ActivityKind } from '../household/types.js';
import { clockOf, minutesOf } from '../ledger/format.js';
import type { AqiBand } from '../naqi/types.js';
import { vulnerableAmong, type Situation } from './context.js';
import { candidateFor } from './draft.js';
import { cleanestStart, effectsBetween, nearbyStarts } from './effects.js';
import { activityName, adviceFor, airToday, capitalise } from './text.js';
import type { CandidateAction, WhatIf } from './types.js';

const WORKOUTS: ReadonlySet<ActivityKind> = new Set(['outdoor_exercise', 'outdoor_play']);

const isWorkout = (activity: Activity): boolean => WORKOUTS.has(activity.kind);

function reassure(s: Situation, activity: Activity): CandidateAction {
  const name = capitalise(activityName(activity));
  const band = s.ctx.band;
  const advice = adviceFor(band, membersOf(s.ctx.household, activity.memberIds));
  const template =
    band === null
      ? {
          title: `${name}: no air reading yet`,
          why: 'We could not get an air reading for your place, so nothing is moved. Check the air card before you go out.',
          tradeOff: null,
        }
      : { title: `${name} is fine today`, why: `${airToday(band)} ${advice.text}`, tradeOff: null };
  const start = minutesOf(activity.start);
  return candidateFor(activity, {
    kind: 'reassure',
    prefix: 'fine',
    start,
    effects: [],
    factIds: advice.factIds,
    template,
    whatIfs: [],
  });
}

function moveIndoors(s: Situation, activity: Activity, band: AqiBand): CandidateAction {
  const advice = adviceFor(band, membersOf(s.ctx.household, activity.memberIds));
  const template = {
    title: `Swap ${activityName(activity)} for ${activity.kind === 'outdoor_play' ? 'indoor play' : 'indoor exercise'} today`,
    why: `${airToday(band)} ${advice.text} Play or exercise indoors keeps the routine going.`,
    tradeOff: null,
  };
  const start = minutesOf(activity.start);
  return candidateFor(activity, {
    kind: 'move_indoors',
    prefix: 'indoors',
    start,
    effects: [],
    factIds: advice.factIds,
    template,
    whatIfs: [],
  });
}

function startToggle(activity: Activity, start: number): WhatIf {
  const clock = clockOf(start);
  return {
    id: `start-${activity.id}-${clock.replace(':', '')}`,
    label: `Start at ${clock}`,
    patch: { op: 'set_start', activityId: activity.id, start: clock },
    factIds: ['exposure-dose-method'],
  };
}

function reschedule(s: Situation, activity: Activity, band: AqiBand): CandidateAction | null {
  const start = cleanestStart(s, activity);
  const effects = start === null ? [] : effectsBetween(s, activity, { ...activity, start: clockOf(start) });
  if (start === null || effects.length === 0) {
    return null;
  }
  const advice = adviceFor(band, membersOf(s.ctx.household, activity.memberIds));
  const window = `${clockOf(start)} to ${clockOf(start + activity.durationMinutes)}`;
  const urgent = s.dayKind === 'severe' && vulnerableAmong(s, activity.memberIds).length > 0;
  const template = {
    title: `Move ${activityName(activity)} to ${clockOf(start)}`,
    why: `${urgent ? 'If it cannot wait, go when the air is cleanest. ' : ''}The forecast is cleaner from ${window} than at ${activity.start}. ${advice.text}`,
    tradeOff: 'The hours come from a model forecast, not a measurement.',
  };
  const whatIfs = nearbyStarts(start, activity.durationMinutes).map((at) => startToggle(activity, at));
  return candidateFor(activity, {
    kind: 'reschedule',
    prefix: 'move',
    start,
    effects,
    factIds: advice.factIds,
    template,
    whatIfs,
  });
}

function wantsIndoors(s: Situation, activity: Activity, band: AqiBand): boolean {
  const atRisk = s.dayKind === 'severe' && vulnerableAmong(s, activity.memberIds).length > 0;
  return isWorkout(activity) && (band === 'severe' || atRisk);
}

function flexibleChoices(s: Situation, activity: Activity, band: AqiBand): (CandidateAction | null)[] {
  if (activity.setting !== 'outdoor' || activity.timing !== 'flexible') {
    return [];
  }
  return [
    wantsIndoors(s, activity, band) ? moveIndoors(s, activity, band) : null,
    reschedule(s, activity, band),
  ];
}

/** The candidates for one activity, most preferred first. Indoor activities with no travel get none. */
export function activityActions(s: Situation, activity: Activity): CandidateAction[] {
  if (activity.setting === 'indoor' && activity.travel === null) {
    return [];
  }
  const band = s.ctx.band;
  if (band === null || s.dayKind === 'mild') {
    return [reassure(s, activity)];
  }
  return [...flexibleChoices(s, activity, band), protect(s, activity, band)].filter(
    (action) => action !== null,
  );
}
