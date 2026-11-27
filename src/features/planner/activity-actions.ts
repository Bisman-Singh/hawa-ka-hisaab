// Candidate actions for one activity: say it is fine, keep it indoors, move it to cleaner hours, or protect it.
// A mild or unknown day only ever gets the first. Order is preference: the rules path takes the first.
import { membersOf } from '../household/members.js';
import { protect } from './protect.js';
import type { Activity, ActivityKind } from '../household/types.js';
import { clockOf, minutesOf } from '../../lib/time.js';
import type { AqiBand } from '../naqi/types.js';
import { vulnerableAmong, type Situation } from './context.js';
import { candidateFor } from './draft.js';
import { cleanestStart, effectsBetween, nearbyStarts, slotOf } from './effects.js';
import { adviceFor, airToday, namesIn } from './text.js';
import type { CandidateAction, WhatIf } from './types.js';
import { say } from './words.js';

const WORKOUTS: ReadonlySet<ActivityKind> = new Set(['outdoor_exercise', 'outdoor_play']);

const isWorkout = (activity: Activity): boolean => WORKOUTS.has(activity.kind);

function reassure(s: Situation, activity: Activity): CandidateAction {
  const names = namesIn(s, activity);
  const band = s.ctx.band;
  const advice = adviceFor(s, membersOf(s.ctx.household, activity.memberIds));
  const template =
    band === null
      ? { title: say(s.lex, 'noair_title', names), why: say(s.lex, 'noair_why'), tradeOff: null }
      : {
          title: say(s.lex, 'fine_title', names),
          why: say(s.lex, 'fine_why', { airToday: airToday(s, band), advice: advice.text }),
          tradeOff: null,
        };
  return candidateFor(activity, {
    kind: 'reassure',
    prefix: 'fine',
    start: minutesOf(activity.start),
    effects: [],
    factIds: advice.factIds,
    template,
    whatIfs: [],
  });
}

function moveIndoors(s: Situation, activity: Activity, band: AqiBand): CandidateAction {
  const advice = adviceFor(s, membersOf(s.ctx.household, activity.memberIds));
  const title = activity.kind === 'outdoor_play' ? 'indoors_title_play' : 'indoors_title_exercise';
  const template = {
    title: say(s.lex, title, namesIn(s, activity)),
    why: say(s.lex, 'indoors_why', { airToday: airToday(s, band), advice: advice.text }),
    tradeOff: null,
  };
  return candidateFor(activity, {
    kind: 'move_indoors',
    prefix: 'indoors',
    start: minutesOf(activity.start),
    effects: [],
    factIds: advice.factIds,
    template,
    whatIfs: [],
  });
}

function startToggle(s: Situation, activity: Activity, start: number): WhatIf {
  const clock = clockOf(start);
  return {
    id: `start-${activity.id}-${clock.replace(':', '')}`,
    label: say(s.lex, 'toggle_start', { time: clock }),
    patch: { op: 'set_start', activityId: activity.id, start: clock },
    factIds: ['exposure-dose-method'],
  };
}

function moveText(s: Situation, activity: Activity, start: number) {
  const advice = adviceFor(s, membersOf(s.ctx.household, activity.memberIds));
  const time = clockOf(start);
  const window = say(s.lex, 'move_window', { start: time, end: clockOf(start + activity.durationMinutes) });
  const urgent = s.dayKind === 'severe' && vulnerableAmong(s, activity.memberIds).length > 0;
  const [from, to] = [slotOf(minutesOf(activity.start)), slotOf(start)];
  const usual = activity.start;
  const why = { urgent: urgent ? say(s.lex, 'move_urgent') : '', window, usual, advice: advice.text };
  const slots = { from: s.lex.slot[from], to: s.lex.slot[to] };
  return {
    factIds: advice.factIds,
    template: {
      title: say(s.lex, 'move_title', { ...namesIn(s, activity), time, usual }),
      why: say(s.lex, 'move_why', why).trim(),
      tradeOff: say(s.lex, from === to ? 'move_trade' : 'move_trade_slot', slots),
    },
  };
}

function reschedule(s: Situation, activity: Activity): CandidateAction | null {
  const start = cleanestStart(s, activity);
  const effects = start === null ? [] : effectsBetween(s, activity, { ...activity, start: clockOf(start) });
  if (start === null || effects.length === 0) {
    return null;
  }
  const whatIfs = nearbyStarts(start, activity.durationMinutes).map((at) => startToggle(s, activity, at));
  return candidateFor(activity, {
    kind: 'reschedule',
    prefix: 'move',
    start,
    effects,
    whatIfs,
    ...moveText(s, activity, start),
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
  return [wantsIndoors(s, activity, band) ? moveIndoors(s, activity, band) : null, reschedule(s, activity)];
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
