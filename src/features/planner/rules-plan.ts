// The rules path: picks candidates by rule and words them with the English templates. With the model
// unavailable this is the product, so it always returns a complete, valid plan.
import { assemblePlan, type Pick } from './assemble.js';
import { situationOf, type CandidateSet, type PlanContext } from './context.js';
import { headlineFor } from './text.js';
import type { CandidateAction, Plan } from './types.js';

/**
 * Which place an action takes in a plan: the one main action of its activity, or its travel swap. Actions not
 * tied to an activity each have their own place. A plan holds at most one action per place.
 */
export function choiceKey(action: CandidateAction): string {
  return `${action.activityId ?? action.id}:${action.kind === 'swap_mode' ? 'swap' : 'main'}`;
}

/**
 * The candidates the rules choose: for each activity, the most preferred action and its travel swap if any.
 * Actions not tied to an activity are all kept.
 */
export function rulesChoice(actions: readonly CandidateAction[]): CandidateAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = choiceKey(action);
    const first = !seen.has(key);
    seen.add(key);
    return first;
  });
}

/** The plan built by rules alone, in English, from the candidates code computed. */
export function rulesPlan(ctx: PlanContext, set: CandidateSet): Plan {
  const picks: Pick[] = rulesChoice(set.actions).map((candidate) => ({
    candidate,
    text: candidate.template,
  }));
  return assemblePlan(ctx, set, { picks, headline: headlineFor(situationOf(ctx)), language: 'en' });
}
