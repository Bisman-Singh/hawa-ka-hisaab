// POST /api/ask: a follow-up question under the plan. Medical questions get the fixed reply before any limit is
// taken; others are answered by the model through calculators bound to this household, or by a labelled fixed line.
import { z } from 'zod';
import { airFacts } from '../../features/air/reading-facts.js';
import { readAir } from '../../features/air/service.js';
import {
  answerQuestion,
  unavailableAnswer,
  type AskInput,
  type AskOutcome,
  type AskReply,
} from '../../features/assistant/ask.js';
import { askRoute } from '../../features/assistant/contract.js';
import { askTools, householdFacts } from '../../features/assistant/tools.js';
import type { AskRequest, AskResponse } from '../../features/assistant/types.js';
import type { AqiBand } from '../../features/naqi/types.js';
import { buildCandidates } from '../../features/planner/candidates.js';
import { buildFactSet, factSetTimes } from '../../features/planner/fact-set.js';
import { contextAt } from '../../features/planner/request-context.js';
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
}

/** The response for the outcome: the fixed medical reply, the checked answer, or the labelled fixed line. */
function responseOf(asked: Asked, outcome: AskOutcome): AskResponse {
  const base = { language: asked.body.language, band: asked.band, trace: outcome.trace };
  if (outcome.kind === 'medical_reply') {
    return { ...base, kind: 'medical_reply', text: outcome.reply.text, factIds: [...outcome.reply.factIds] };
  }
  if (outcome.kind === 'checked') {
    return { ...base, kind: 'answer', text: outcome.value.text, factIds: toolFactIds(outcome.trace) };
  }
  return { ...base, kind: 'answer', ...unavailableAnswer(asked.body.language, asked.band) };
}

/** The question with the household's context, its facts and calculators, for the air at its place now. */
async function askInput(deps: ServerDeps, body: AskRequest, now: number): Promise<AskInput> {
  const air = await readAir(deps.air, deps.clock, body.location);
  const ctx = contextAt(body.household, air, now);
  const set = buildCandidates(ctx);
  const reading = airFacts(air.reading);
  const facts = [...reading.facts, ...householdFacts(body.household), ...buildFactSet(ctx, set)];
  return {
    question: body.question,
    language: body.language,
    band: ctx.band,
    context: { household: body.household, air: { ...reading.summary } },
    sources: [
      { ...reading.summary },
      ...body.household.activities.map((activity) => activity.start),
      ...factSetTimes(ctx, set),
    ],
    facts: facts.slice(0, MAX_FACTS),
    tools: askTools(ctx, set),
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
    return ok(responseOf({ body, band: input.band }, outcome));
  });
};
