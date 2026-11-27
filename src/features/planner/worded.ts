// Which candidates the model words: those of at most twelve activities, the ones of people the advisory counts
// as vulnerable first, so a request stays small however large the household. Rules templates word the rest.
import { isVulnerable, membersOf } from '../household/members.js';
import type { Household } from '../household/types.js';
import type { CandidateSet } from './context.js';
import { rulesChoice } from './rules-plan.js';
import type { CandidateAction } from './types.js';

/** Most activities whose candidates go to the model in one plan request. */
export const MAX_WORDED_ACTIVITIES = 12;

/** The ids of the activities the model words, vulnerable people's first, then in the household's order. */
export function wordedActivityIds(household: Household): ReadonlySet<string> {
  const rank = (memberIds: readonly string[]): number =>
    membersOf(household, memberIds).some(isVulnerable) ? 0 : 1;
  const ordered = household.activities
    .map((activity, index) => ({ id: activity.id, rank: rank(activity.memberIds), index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
  return new Set(ordered.slice(0, MAX_WORDED_ACTIVITIES).map((entry) => entry.id));
}

const isWorded = (ids: ReadonlySet<string>, action: CandidateAction): boolean =>
  action.activityId === null || ids.has(action.activityId);

/** The candidates the model may choose among and word. */
export function wordedActions(set: CandidateSet, household: Household): CandidateAction[] {
  const ids = wordedActivityIds(household);
  return set.actions.filter((action) => isWorded(ids, action));
}

/** The rules' choice for the activities the model was not asked about, worded by their templates. */
export function unwordedChoice(set: CandidateSet, household: Household): CandidateAction[] {
  const ids = wordedActivityIds(household);
  return rulesChoice(set.actions).filter((action) => !isWorded(ids, action));
}
