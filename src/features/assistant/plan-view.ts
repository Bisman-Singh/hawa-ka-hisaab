// What the model reads about a household and its plan: people and activities in words, each candidate with its
// effects as plain sentences and its template text. No working, no forecast values, so the view stays small.
import { describeMember } from '../household/members.js';
import type { FactValue } from '../../lib/types.js';
import type { CandidateSet, PlanContext } from '../planner/context.js';
import { buildFactSet, factSetTimes } from '../planner/fact-set.js';
import { wordedActions, wordedActivityIds } from '../planner/worded.js';
import { householdFacts } from './tools.js';
import type { airFacts, AirSummary } from '../air/reading-facts.js';
import type { Activity, Household, Travel } from '../household/types.js';
import { effectDisplay } from '../ledger/display.js';
import { activityName } from '../planner/text.js';
import type { CandidateAction } from '../planner/types.js';

function tripWords(travel: Travel): string {
  const parts = [
    travel.mode.replace('_', ' '),
    travel.fuel ?? '',
    travel.distanceKm === null ? 'distance not given' : `${String(travel.distanceKm)} km one way`,
    travel.roundTrip ? 'there and back' : 'one way',
    travel.occupancy === null ? 'riders not given' : `${String(travel.occupancy)} in the vehicle`,
  ];
  return parts.filter((part) => part !== '').join(', ');
}

/** An activity as the model reads it. A type literal, so it is plain JSON. */
export type ActivityView = Pick<Activity, 'id' | 'start' | 'timing' | 'setting'> & {
  readonly name: string;
  readonly who: readonly string[];
  readonly minutes: number;
  readonly trip: string | null;
};

/** A candidate as the model reads it: its effects in plain sentences instead of their working. */
export type CandidateView = Pick<
  CandidateAction,
  'id' | 'kind' | 'activityId' | 'slot' | 'start' | 'template'
> & {
  readonly effects: readonly string[];
};

function activityView(activity: Activity): ActivityView {
  return {
    id: activity.id,
    name: activityName(activity),
    who: activity.memberIds,
    start: activity.start,
    minutes: activity.durationMinutes,
    timing: activity.timing,
    setting: activity.setting,
    trip: activity.travel === null ? null : tripWords(activity.travel),
  };
}

function candidateView(candidate: CandidateAction): CandidateView {
  return {
    id: candidate.id,
    kind: candidate.kind,
    activityId: candidate.activityId,
    slot: candidate.slot,
    start: candidate.start,
    effects: candidate.effects.map((effect) => effectDisplay(effect).sentence),
    template: candidate.template,
  };
}

/**
 * The household in words: members by id with their age group and conditions, and the activities the candidates
 * are about, with their own names, times and trips.
 */
export function householdView(
  household: Household,
  activityIds: ReadonlySet<string>,
): { readonly members: readonly { id: string; is: string }[]; readonly activities: readonly ActivityView[] } {
  return {
    members: household.members.map((member) => ({ id: member.id, is: describeMember(member) })),
    activities: household.activities.filter((activity) => activityIds.has(activity.id)).map(activityView),
  };
}

/** The candidates in brief, and the titles of the steps and swaps the plan shows anyway. */
export function candidatesView(
  set: CandidateSet,
  actions: readonly CandidateAction[],
): { readonly candidates: readonly CandidateView[]; readonly alsoInPlan: readonly string[] } {
  return {
    candidates: actions.map(candidateView),
    alsoInPlan: [
      ...set.indoor.map((step) => step.title),
      ...set.alternatives.map((pair) => `${pair.instead}: ${pair.doThis}`),
    ],
  };
}

/** The upstream names whose digits count only as part of the whole name: the station's, when there is one. */
export function stationNames(air: AirSummary): string[] {
  return air.station === null ? [] : [air.station];
}

const names = (text: string, activity: Activity): boolean =>
  text.includes(activityName(activity).toLowerCase()) || text.includes(activity.start);

/**
 * The facts behind the plan's options for the activities an answer names, by their own names or their start
 * times, which read the same in Hindi: each option's cited facts and the facts behind its effects, at most twelve.
 */
export function citedByAnswer(
  text: string,
  actions: readonly CandidateAction[],
  household: Household,
): string[] {
  const said = text.toLowerCase();
  const named = new Set(household.activities.filter((activity) => names(said, activity)).map((a) => a.id));
  const ids = actions
    .filter((action) => action.activityId !== null && named.has(action.activityId))
    .flatMap((action) => [...action.factIds, ...action.effects.flatMap((effect) => effect.working.factIds)]);
  return [...new Set(ids)].slice(0, 12);
}

/** What a model request about a plan holds: the candidates of the activities it covers, their facts and times. */
export interface PlanBrief {
  readonly scoped: CandidateSet;
  readonly activityIds: ReadonlySet<string>;
  readonly facts: readonly FactValue[];
  readonly times: readonly string[];
}

/** Most facts one request may send, as the trace allows. */
const MAX_FACTS = 500;

/**
 * The candidates of at most MAX_WORDED_ACTIVITIES activities and only the facts behind them, the household's own
 * numbers for those activities and the air, so a plan or ask request stays small however large the household is.
 */
export function planBrief(
  ctx: PlanContext,
  set: CandidateSet,
  reading: ReturnType<typeof airFacts>,
): PlanBrief {
  const { household } = ctx;
  const scoped: CandidateSet = { ...set, actions: wordedActions(set, household) };
  const activityIds = wordedActivityIds(household);
  const activities = household.activities.filter((activity) => activityIds.has(activity.id));
  const facts = [
    ...reading.facts,
    ...householdFacts({ ...household, activities }),
    ...buildFactSet(ctx, scoped),
  ];
  return { scoped, activityIds, facts: facts.slice(0, MAX_FACTS), times: factSetTimes(ctx, scoped) };
}
