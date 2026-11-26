// Builds the plan from the model's wording reply. Every id must name a candidate that was sent; every number,
// time and effect comes from the candidate, never from the reply. Protection the rules require is kept.
import { err, ok, type Result } from '../../lib/result.js';
import type { Language } from '../../lib/types.js';
import { assemblePlan, leadsTheDay, type Pick } from './assemble.js';
import { situationOf, type CandidateSet, type PlanContext } from './context.js';
import { rulesChoice } from './rules-plan.js';
import type { PlanWording, Plan } from './types.js';

/** Why a wording reply was refused: it named candidates that were never sent. The caller falls back to rules. */
export interface WordingFailure {
  readonly kind: 'unknown_candidate';
  readonly ids: readonly string[];
}

/** The model's reply and the language its words are in. */
export interface WordingReply {
  readonly wording: PlanWording;
  readonly language: Language;
}

function matchCandidates(set: CandidateSet, wording: PlanWording): { chosen: Pick[]; unknown: string[] } {
  const byId = new Map(set.actions.map((candidate) => [candidate.id, candidate]));
  const chosen: Pick[] = [];
  const unknown: string[] = [];
  for (const item of wording.items) {
    const candidate = byId.get(item.candidateId);
    if (candidate) {
      chosen.push({ candidate, text: item });
    } else {
      unknown.push(item.candidateId);
    }
  }
  return { chosen, unknown };
}

/**
 * The plan in the model's order and words. On a severe day, protection for vulnerable members that the rules
 * would include and the model left out is added with its English template text, ahead of the rest.
 */
export function planFromWording(
  ctx: PlanContext,
  set: CandidateSet,
  reply: WordingReply,
): Result<Plan, WordingFailure> {
  const { chosen, unknown } = matchCandidates(set, reply.wording);
  if (unknown.length > 0) {
    return err({ kind: 'unknown_candidate', ids: unknown });
  }
  const s = situationOf(ctx);
  const named = new Set(chosen.map((pick) => pick.candidate.id));
  const required: Pick[] = rulesChoice(set.actions)
    .filter((candidate) => leadsTheDay(s, candidate) && !named.has(candidate.id))
    .map((candidate) => ({ candidate, text: candidate.template }));
  return ok(
    assemblePlan(ctx, set, {
      picks: [...required, ...chosen],
      headline: reply.wording.headline,
      language: reply.language,
    }),
  );
}
