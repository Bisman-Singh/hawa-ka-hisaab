// POST /api/plan: the day plan for a household at a place, in its language. The server reads the air, code computes
// every candidate and number, the model words them under the guards, and the rules plan answers whenever it cannot.
import { airFacts } from '../../features/air/reading-facts.js';
import { readAir } from '../../features/air/service.js';
import type { Guarded } from '../../features/assistant/guarded.js';
import { planBrief } from '../../features/assistant/plan-view.js';
import { wordPlan, type PlanWordingInput } from '../../features/assistant/word-plan.js';
import type { Language, Trace } from '../../lib/types.js';
import { buildCandidates } from '../../features/planner/candidates.js';
import type { CandidateSet, PlanContext } from '../../features/planner/context.js';
import { planRoute } from '../../features/planner/contract.js';
import { dayKindForBand } from '../../features/planner/day-kind.js';
import { planFromWording } from '../../features/planner/from-wording.js';
import { airBasisOf, contextAt, whatIfContextOf } from '../../features/planner/request-context.js';
import { rulesPlan } from '../../features/planner/rules-plan.js';
import type { Plan, PlanRequest, PlanWording } from '../../features/planner/types.js';
import { ok } from '../../lib/result.js';
import type { RouteModule } from '../deps.js';
import { createModelRoute, logFallback, runFor } from '../model-route.js';
import { mountPost } from '../mount.js';

/**
 * The plan from a guarded wording, or the rules plan. A checked wording that still fails to place, which the
 * guards should make impossible, is served as the rules plan with the reason invalid_reply, refused by the ids
 * check, and like every refused reply its text is not kept.
 */
export function planFromModel(
  plan: { readonly ctx: PlanContext; readonly set: CandidateSet; readonly language: Language },
  worded: Guarded<PlanWording>,
): { readonly plan: Plan; readonly trace: Trace } {
  if (worded.kind === 'fallback') {
    return { plan: rulesPlan(plan.ctx, plan.set), trace: worded.trace };
  }
  const placed = planFromWording(plan.ctx, plan.set, { wording: worded.value, language: plan.language });
  if (placed.ok) {
    return { plan: placed.value, trace: worded.trace };
  }
  const trace: Trace = {
    ...worded.trace,
    producedBy: 'rules',
    fallbackReason: 'invalid_reply',
    modelReply: null,
    refusedBy: 'ids',
  };
  return { plan: rulesPlan(plan.ctx, plan.set), trace };
}

/** What goes to the model for a plan: the brief of its candidates and facts, the household, the day and the air. */
function wordingInput(
  body: PlanRequest,
  ctx: PlanContext,
  { set, reading }: { readonly set: CandidateSet; readonly reading: ReturnType<typeof airFacts> },
): PlanWordingInput {
  const brief = planBrief(ctx, set, reading);
  return {
    candidates: brief.scoped.actions,
    set,
    facts: brief.facts,
    times: brief.times,
    household: body.household,
    dayKind: dayKindForBand(ctx.band),
    language: body.language,
    air: reading.summary,
  };
}

/** Registers the plan route. Over the model limit, out of time or without a key it answers on the rules path. */
export const registerPlan: RouteModule = (target) => {
  const { deps } = target;
  const route = createModelRoute<PlanWording>(deps, planRoute.path);
  mountPost(target, planRoute, async (body, meta) => {
    const started = deps.clock.now();
    const air = await readAir(deps.air, deps.clock, body.location);
    const ctx: PlanContext = { ...contextAt(body.household, air, started), language: body.language };
    const set = buildCandidates(ctx);
    const worded = await wordPlan(
      runFor(route, meta, started),
      wordingInput(body, ctx, { set, reading: airFacts(air.reading) }),
    );
    const { plan, trace } = planFromModel({ ctx, set, language: body.language }, worded);
    logFallback(route, trace.fallbackReason);
    return ok({ plan, airBasis: airBasisOf(air), trace, whatIfContext: whatIfContextOf(ctx) });
  });
};
