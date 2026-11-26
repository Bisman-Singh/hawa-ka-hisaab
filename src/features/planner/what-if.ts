// What-if toggles: applies a patch and recomputes the effects of the changed activity with the same pure
// functions the plan used. Runs in the browser as well as on the server.
import { applyHouseholdPatch, type PatchFailure } from '../household/apply-patch.js';
import type { HouseholdPatch } from '../household/types.js';
import { err, ok, type Result } from '../../lib/result.js';
import type { Effect } from '../ledger/types.js';
import { situationOf, type PlanContext } from './context.js';
import { effectsBetween } from './effects.js';

/** Why a toggle gave no effects: the patch failed, or it changes the home rather than an activity. */
export type WhatIfFailure = PatchFailure | 'not_an_activity_change';

/**
 * The effects of a toggle's patch against the household as entered, such as the CO2 and breathing change of
 * taking the bus. Home patches have no cited factor to recompute and are refused.
 */
export function whatIfEffects(ctx: PlanContext, patch: HouseholdPatch): Result<Effect[], WhatIfFailure> {
  if (!('activityId' in patch)) {
    return err('not_an_activity_change');
  }
  const next = applyHouseholdPatch(ctx.household, patch);
  if (!next.ok) {
    return next;
  }
  const s = situationOf(ctx);
  return ok(
    next.value.activities.flatMap((after) => {
      const before = ctx.household.activities.find(
        (found) => found.id === after.id && found.id === patch.activityId,
      );
      return before ? effectsBetween(s, before, after) : [];
    }),
  );
}
