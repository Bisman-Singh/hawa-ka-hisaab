// Plan wording: the model chooses, orders and words candidate actions computed in code. It adds no numbers.
import type { FactValue, Language } from '../../lib/types.js';
import type { AirSummary } from '../air/reading-facts.js';
import type { Household } from '../household/types.js';
import type { CandidateAction, Plan, PlanWording } from '../planner/types.js';
import { choiceKey } from '../planner/rules-plan.js';
import { planWordingSchema } from '../planner/wording.js';
import { runGuarded, type Guarded, type ModelRun } from './guarded.js';
import { PLAN_INSTRUCTIONS, type GuardProblem } from './instructions.js';

/**
 * What the planner hands over: its candidates, the facts behind their numbers, the clock times the facts hold,
 * the household, the day, the language and the air in brief. facts must hold every number the candidates' text
 * and the air summary show.
 */
export interface PlanWordingInput {
  readonly candidates: readonly CandidateAction[];
  readonly facts: readonly FactValue[];
  readonly times: readonly string[];
  readonly household: Household;
  readonly dayKind: Plan['dayKind'];
  readonly language: Language;
  readonly air: AirSummary;
}

const proseOf = (wording: PlanWording): string[] => [
  wording.headline,
  ...wording.items.flatMap((item) => [
    item.title,
    item.why,
    ...(item.tradeOff === null ? [] : [item.tradeOff]),
  ]),
];

/** The template text and toggle labels the candidates show, which the wording may repeat. Raw values stay out. */
const shownText = (candidates: readonly CandidateAction[]): string[] =>
  candidates.flatMap((candidate) => [
    candidate.template.title,
    candidate.template.why,
    candidate.template.tradeOff ?? '',
    ...candidate.whatIfs.map((toggle) => toggle.label),
  ]);

/** Names an id that was not sent, or two actions for the same place in the plan, such as keep and move. */
function wordingProblem(
  byId: ReadonlyMap<string, CandidateAction>,
  wording: PlanWording,
): GuardProblem | null {
  const places: string[] = [];
  for (const item of wording.items) {
    const candidate = byId.get(item.candidateId);
    if (!candidate) {
      return 'ids';
    }
    places.push(choiceKey(candidate));
  }
  return new Set(places).size === places.length ? null : 'one_place';
}

/**
 * Words a plan. Checked wording names only candidates that were sent, at most one main action and one travel swap
 * per activity, and repeats only numbers in the facts and the times they hold. The planner still takes every
 * number and time from its candidates.
 */
export function wordPlan(run: ModelRun<PlanWording>, input: PlanWordingInput): Promise<Guarded<PlanWording>> {
  const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const data = {
    language: input.language,
    dayKind: input.dayKind,
    air: { ...input.air },
    household: input.household,
    candidates: input.candidates,
  };
  return runGuarded(run, {
    request: {
      task: 'plan',
      instructions: PLAN_INSTRUCTIONS,
      data: JSON.stringify(data),
      facts: input.facts,
      schema: planWordingSchema,
      tools: [],
    },
    sources: () => [{ ...input.air }, ...input.times, ...shownText(input.candidates)],
    prose: proseOf,
    check: (wording) => wordingProblem(byId, wording),
  });
}
