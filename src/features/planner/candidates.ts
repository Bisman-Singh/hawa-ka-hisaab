// Builds every candidate for a plan from the household, the band and the forecast curve, before any model call.
import type { Household } from '../household/types.js';
import { activityActions } from './activity-actions.js';
import { alternativesFor } from './alternatives.js';
import { situationOf, type CandidateSet, type PlanContext, type Situation } from './context.js';
import { indoorSteps } from './indoor.js';
import { swapAction } from './swap.js';
import type { CandidateAction } from './types.js';

function afterMove(household: Household, top: CandidateAction | undefined): Household {
  const moved =
    top?.kind === 'reschedule' && top.start !== null ? { id: top.activityId, start: top.start } : null;
  if (moved === null) {
    return household;
  }
  const activities = household.activities.map((activity) =>
    activity.id === moved.id ? { ...activity, start: moved.start } : activity,
  );
  return { ...household, activities };
}

/**
 * Every applicable action for each activity, in order of preference, then the swap for its trip; the indoor
 * steps; and the alternatives. When an activity's first choice is a move, later activities of the same people
 * plan around its new time. All numbers are computed here; the model may only choose among and word these.
 */
export function buildCandidates(ctx: PlanContext): CandidateSet {
  const base = situationOf(ctx);
  const actions: CandidateAction[] = [];
  let household = ctx.household;
  for (const activity of ctx.household.activities) {
    const s: Situation = { ...base, ctx: { ...ctx, household } };
    const own = activityActions(s, activity);
    const swap = swapAction(base, activity);
    actions.push(...own, ...(swap ? [swap] : []));
    household = afterMove(household, own[0]);
  }
  return { actions, indoor: indoorSteps(base), alternatives: alternativesFor(base) };
}
