// The exact list of numbers the model may use for a plan. It goes with the request and into the trace, so the
// number check has one source of truth: cited facts, every shown figure as shown, clock times and household inputs.
import type { FactValue } from '../../lib/types.js';
import type { Household } from '../household/types.js';
import { clockOf, minutesOf } from '../ledger/format.js';
import type { CandidateSet, PlanContext } from './context.js';
import { cited, clock, figure, shown, value } from './fact-values.js';

const MAX_FACTS = 500;
import type { CandidateAction, IndoorStep } from './types.js';

function activityNumbers(household: Household, candidate: CandidateAction): FactValue[] {
  const activity = household.activities.find((found) => found.id === candidate.activityId);
  if (!activity) {
    return [];
  }
  const travel = activity.travel;
  const end = clockOf(minutesOf(candidate.start ?? activity.start) + activity.durationMinutes);
  return [
    ...clock(candidate.id, 'Usual start time', activity.start),
    ...clock(candidate.id, 'End time', end),
    value(
      { id: candidate.id, label: 'Minutes the activity takes', unit: 'minutes' },
      activity.durationMinutes,
    ),
    ...(travel?.distanceKm
      ? [value({ id: candidate.id, label: 'Distance one way', unit: 'km' }, travel.distanceKm)]
      : []),
    ...(travel?.occupancy
      ? [value({ id: candidate.id, label: 'People in the vehicle', unit: 'people' }, travel.occupancy)]
      : []),
  ];
}

function actionNumbers(household: Household, candidate: CandidateAction): FactValue[] {
  const id = candidate.id;
  const toggles = candidate.whatIfs.flatMap((toggle) =>
    toggle.patch.op === 'set_start' ? clock(toggle.id, toggle.label, toggle.patch.start) : [],
  );
  return [
    ...(candidate.start === null ? [] : clock(id, 'Start time', candidate.start)),
    ...candidate.effects.flatMap((effect) => shown(id, effect)),
    ...activityNumbers(household, candidate),
    ...toggles,
  ];
}

function stepNumbers(step: IndoorStep): FactValue[] {
  const window = step.window
    ? [
        ...clock(step.id, 'Window opens', step.window.start),
        ...clock(step.id, 'Window closes', step.window.end),
      ]
    : [];
  return [...window, ...(step.figure ? figure(step.id, step.figure) : [])];
}

function citedIds(set: CandidateSet): string[] {
  const effects = [
    ...set.actions.flatMap((action) => action.effects),
    ...set.alternatives.flatMap((alt) => (alt.effect ? [alt.effect] : [])),
  ];
  return [
    ...set.actions.flatMap((action) => [
      ...action.factIds,
      ...action.whatIfs.flatMap((toggle) => toggle.factIds),
    ]),
    ...set.indoor.flatMap((step) => [...step.factIds, ...(step.figure?.working.factIds ?? [])]),
    ...set.alternatives.flatMap((alt) => alt.factIds),
    ...effects.flatMap((effect) => effect.working.factIds),
  ];
}

/** Every number the model may mention for this plan, once each, at most five hundred. */
export function buildFactSet(ctx: PlanContext, set: CandidateSet): FactValue[] {
  const all = [
    ...[...new Set(citedIds(set))].flatMap(cited),
    ...set.actions.flatMap((action) => actionNumbers(ctx.household, action)),
    ...set.indoor.flatMap(stepNumbers),
    ...set.alternatives.flatMap((alt) => (alt.effect ? shown(alt.id, alt.effect) : [])),
  ];
  const seen = new Set<string>();
  return all
    .filter((fact) => {
      const key = `${fact.id}|${String(fact.value)}`;
      const first = !seen.has(key);
      seen.add(key);
      return first;
    })
    .slice(0, MAX_FACTS);
}
