// Plans made in this browser when the model is off for it: the same pure functions the plan route runs on its rules
// path, on the air this page read, so nothing about the household leaves the browser.
import type { AirResponse } from '../../features/air/types.js';
import type { Household } from '../../features/household/types.js';
import { buildCandidates } from '../../features/planner/candidates.js';
import { airBasisOf, contextAt, whatIfContextOf } from '../../features/planner/request-context.js';
import { rulesPlan } from '../../features/planner/rules-plan.js';
import type { PlanResponse } from '../../features/planner/types.js';
import type { Trace } from '../../lib/types.js';

/** The trace of an answer made in this browser: fixed rules wrote it and nothing was sent to the model. */
export const LOCAL_TRACE: Trace = {
  producedBy: 'rules',
  modelId: null,
  fallbackReason: null,
  factsSent: [],
  modelReply: null,
  toolCalls: [],
  numberCheck: { status: 'not_run', attempts: 0, unmatched: [] },
  cached: false,
};

/** The rules plan for a household on this air at this moment, as the plan route would serve it without the model. */
export function localPlan(household: Household, air: AirResponse, now: number): PlanResponse {
  const ctx = contextAt(household, air, now);
  return {
    plan: rulesPlan(ctx, buildCandidates(ctx)),
    airBasis: airBasisOf(air),
    trace: LOCAL_TRACE,
    whatIfContext: whatIfContextOf(ctx),
  };
}
