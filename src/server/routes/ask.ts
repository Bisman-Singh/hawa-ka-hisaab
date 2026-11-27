// POST /api/ask: a follow-up question under the plan. Medical questions get the fixed reply before any limit is
// taken; others are answered by the model through calculators bound to this household, or by a labelled fixed line.
import { z } from 'zod';
import { airFacts } from '../../features/air/reading-facts.js';
import { readAir } from '../../features/air/service.js';
import {
  answerQuestion,
  unansweredBy,
  unavailableAnswer,
  type AskInput,
  type AskOutcome,
  type AskReply,
} from '../../features/assistant/ask.js';
import {
  candidatesView,
  citedByAnswer,
  householdView,
  stationNames,
} from '../../features/assistant/plan-view.js';
import { askRoute } from '../../features/assistant/contract.js';
import { askTools, householdFacts } from '../../features/assistant/tools.js';
import type { AskRequest, AskResponse } from '../../features/assistant/types.js';
import type { AqiBand } from '../../features/naqi/types.js';
import { buildCandidates } from '../../features/planner/candidates.js';
import { buildFactSet, factSetTimes } from '../../features/planner/fact-set.js';
import type { CandidateSet } from '../../features/planner/context.js';
import { contextAt } from '../../features/planner/request-context.js';
import { wordedActions, wordedActivityIds } from '../../features/planner/worded.js';
import { ok } from '../../lib/result.js';
import { factIdSchema } from '../../lib/schemas/facts.js';
import type { Trace } from '../../lib/types.js';
import type { RouteModule, ServerDeps } from '../deps.js';
import { createModelRoute, logFallback, runFor } from '../model-route.js';
import { mountPost } from '../mount.js';

const MAX_FACTS = 500;
const MAX_FACT_IDS = 12;
const citing = z.object({ factIds: z.array(factIdSchema) });

/** The facts the calculators cited in this answer, once each. */
function toolFactIds(trace: Trace): string[] {
  const ids = trace.toolCalls.flatMap((call) => {
    const parsed = citing.safeParse(call.result);
    return parsed.success ? parsed.data.factIds : [];
  });
  return [...new Set(ids)].slice(0, MAX_FACT_IDS);
}

interface Asked {
  readonly body: AskRequest;
  readonly band: AqiBand | null;
  readonly cite: (text: string) => string[];
}

/** The response for the outcome: the fixed medical reply, the checked answer, or the labelled fixed line. */
function responseOf(asked: Asked, outcome: AskOutcome): AskResponse {
  const base = { language: asked.body.language, band: asked.band, trace: outcome.trace };
  if (outcome.kind === 'medical_reply') {
    return { ...base, kind: 'medical_reply', text: outcome.reply.text, factIds: [...outcome.reply.factIds] };
  }
  if (outcome.kind === 'checked') {
    const factIds = [...new Set([...toolFactIds(outcome.trace), ...asked.cite(outcome.value.text)])];
    return { ...base, kind: 'answer', text: outcome.value.text, factIds: factIds.slice(0, MAX_FACT_IDS) };
  }
  const why = unansweredBy(outcome.trace);
  return { ...base, kind: 'answer', ...unavailableAnswer(asked.body.language, asked.band, why) };
}

/**
 * The question with the household's context, its facts and calculators, for the air at its place now. The context
 * holds the plan's candidates for at most twelve activities in words, and the facts only theirs; the calculators
 * still reach every activity and room.
 */
async function askInput(
  deps: ServerDeps,
  body: AskRequest,
  now: number,
): Promise<AskInput & Pick<Asked, 'cite'>> {
  const air = await readAir(deps.air, deps.clock, body.location);
  const ctx = { ...contextAt(body.household, air, now), language: body.language };
  const set = buildCandidates(ctx);
  const scoped: CandidateSet = { ...set, actions: wordedActions(set, body.household) };
  const ids = wordedActivityIds(body.household);
  const reading = airFacts(air.reading);
  const household = { ...body.household, activities: body.household.activities.filter((a) => ids.has(a.id)) };
  const facts = [...reading.facts, ...householdFacts(household), ...buildFactSet(ctx, scoped)];
  const plan = candidatesView(scoped, scoped.actions);
  return {
    question: body.question,
    language: body.language,
    band: ctx.band,
    context: { household: householdView(body.household, ids), air: { ...reading.summary }, plan },
    sources: [
      { ...reading.summary, station: null },
      ...household.activities.map((a) => a.start),
      ...factSetTimes(ctx, scoped),
    ],
    facts: facts.slice(0, MAX_FACTS),
    tools: askTools(ctx, set),
    names: stationNames(reading.summary),
    cite: (text) => citedByAnswer(text, scoped.actions, body.household),
  };
}

/** Registers the ask route. */
export const registerAsk: RouteModule = (target) => {
  const { deps } = target;
  const route = createModelRoute<AskReply>(deps, askRoute.path);
  mountPost(target, askRoute, async (body, meta) => {
    const started = deps.clock.now();
    const input = await askInput(deps, body, started);
    const outcome = await answerQuestion(runFor(route, meta, started), input);
    logFallback(route, outcome.kind === 'fallback' ? outcome.reason : null);
    return ok(responseOf({ body, band: input.band, cite: input.cite }, outcome));
  });
};
