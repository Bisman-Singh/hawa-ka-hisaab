// Places chosen candidates with their wording into the morning, afternoon and evening of a valid plan.
// Fixed commitments keep their time; on a severe day protection of vulnerable members leads each slot.
import type { Language } from '../../lib/types.js';
import { minutesOf } from '../../lib/time.js';
import { situationOf, vulnerableAmong } from './context.js';
import type { CandidateSet, PlanContext, Situation } from './context.js';
import type { ActionText, CandidateAction, Plan, PlanItem, Slot } from './types.js';

/** A chosen candidate with the words to show for it. */
export interface Pick {
  readonly candidate: CandidateAction;
  readonly text: ActionText;
}

/** What a plan is assembled from besides the candidates: the chosen items, the headline and the language. */
export interface Choice {
  readonly picks: readonly Pick[];
  readonly headline: string;
  readonly language: Language;
}

const SLOT_CAP = 12;

/** Every item of a plan, morning first. */
export function planItems(plan: Plan): PlanItem[] {
  return [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
}

/** True for a protect or indoors item that covers a vulnerable member on a severe day. */
export function leadsTheDay(s: Situation, candidate: CandidateAction): boolean {
  const protective = candidate.kind === 'protect' || candidate.kind === 'move_indoors';
  return s.dayKind === 'severe' && protective && vulnerableAmong(s, candidate.memberIds).length > 0;
}

function toItem({ candidate, text }: Pick): PlanItem {
  const { kind, slot, activityId, memberIds, start, effects, factIds, whatIfs } = candidate;
  const words = { title: text.title, why: text.why, tradeOff: text.tradeOff };
  return {
    candidateId: candidate.id,
    kind,
    slot,
    activityId,
    memberIds,
    start,
    effects,
    factIds,
    whatIfs,
    ...words,
  };
}

function ordered(s: Situation, picks: readonly Pick[], slot: Slot): PlanItem[] {
  const rank = (pick: Pick): number => (leadsTheDay(s, pick.candidate) ? 0 : 1);
  const time = (pick: Pick): number => minutesOf(pick.candidate.start ?? '23:59');
  return picks
    .filter((pick) => pick.candidate.slot === slot)
    .sort((a, b) => rank(a) - rank(b) || time(a) - time(b))
    .slice(0, SLOT_CAP)
    .map(toItem);
}

/** The plan for the context's date from these picks, with the set's indoor steps and alternatives. */
export function assemblePlan(ctx: PlanContext, set: CandidateSet, choice: Choice): Plan {
  const s = situationOf(ctx);
  return {
    date: ctx.date,
    dayKind: s.dayKind,
    band: ctx.band,
    headline: choice.headline,
    slots: {
      morning: ordered(s, choice.picks, 'morning'),
      afternoon: ordered(s, choice.picks, 'afternoon'),
      evening: ordered(s, choice.picks, 'evening'),
    },
    indoor: [...set.indoor],
    alternatives: [...set.alternatives],
    language: choice.language,
  };
}
