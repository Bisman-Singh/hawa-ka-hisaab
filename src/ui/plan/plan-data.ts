// Pure helpers for the plan screens: where each entry sits in the day, the sums beside it and words for the
// household. Every figure comes from the ledger's own formatters, and what-if sums from the planner's function.
import type { HourCurve } from '../../features/air/types.js';
import { describeMember, isVulnerable, membersOf } from '../../features/household/members.js';
import type { Activity, Household } from '../../features/household/types.js';
import { describeChange, formatEffect, minutesOf } from '../../features/ledger/format.js';
import type { Effect } from '../../features/ledger/types.js';
import type { PlanContext } from '../../features/planner/context.js';
import { slotOf } from '../../features/planner/effects.js';
import type { Plan, PlanItem, Slot, WhatIf } from '../../features/planner/types.js';
import { whatIfEffects } from '../../features/planner/what-if.js';
import type { SumRow } from '../components/Ledger.js';
import { PLAN } from './strings.js';

/** A sum beside an entry in plain strings, so it can also be read out. none marks the reason there is no figure. */
export interface Sum {
  readonly label: string;
  readonly text: string;
  readonly none: boolean;
}

/** One line of a slot: a plan item, or the struck-through place a moved activity left. */
export type Entry =
  | { readonly kind: 'item'; readonly item: PlanItem; readonly at: string; readonly slot: Slot }
  | {
      readonly kind: 'moved';
      readonly item: PlanItem;
      readonly activity: Activity;
      readonly at: string;
      readonly slot: Slot;
    };

/** The three parts of the day, in order. */
export const SLOTS: readonly Slot[] = ['morning', 'afternoon', 'evening'];

/** Every item of the plan, morning first. */
export function itemsOf(plan: Plan): PlanItem[] {
  return SLOTS.flatMap((slot) => plan.slots[slot]);
}

/** The household activity an item is about, or null when it is not about one. */
export function activityOf(household: Household, id: string | null): Activity | null {
  return household.activities.find((activity) => activity.id === id) ?? null;
}

const leads = (plan: Plan, household: Household, entry: Entry): boolean =>
  entry.kind === 'item' &&
  plan.dayKind === 'severe' &&
  (entry.item.kind === 'protect' || entry.item.kind === 'move_indoors') &&
  membersOf(household, entry.item.memberIds).some(isVulnerable);

function allEntries(plan: Plan, household: Household): Entry[] {
  const items = itemsOf(plan);
  return [
    ...items.map((item): Entry => ({ kind: 'item', item, at: item.start ?? '00:00', slot: item.slot })),
    ...items.flatMap((item): Entry[] => {
      const activity = activityOf(household, item.activityId);
      return item.kind === 'reschedule' && activity
        ? [{ kind: 'moved', item, activity, at: activity.start, slot: slotOf(minutesOf(activity.start)) }]
        : [];
    }),
  ];
}

/**
 * The entries of each slot by time. On a severe day protection for vulnerable members leads its slot, as the
 * planner orders it. A moved activity also shows, struck through, at the time it left.
 */
export function entriesBySlot(plan: Plan, household: Household): Readonly<Record<Slot, Entry[]>> {
  const rank = (entry: Entry): number => (leads(plan, household, entry) ? 0 : 1);
  const sorted = allEntries(plan, household).sort(
    (a, b) => rank(a) - rank(b) || minutesOf(a.at) - minutesOf(b.at),
  );
  const inSlot = (slot: Slot): Entry[] => sorted.filter((entry) => entry.slot === slot);
  return { morning: inSlot('morning'), afternoon: inSlot('afternoon'), evening: inSlot('evening') };
}

/** The sums for a list of effects, worded by the ledger. With no effect, why there is no figure. */
export function sumsOf(effects: readonly Effect[], mild: boolean): Sum[] {
  if (effects.length === 0) {
    return [{ label: PLAN.effect, text: mild ? PLAN.noneNeeded : PLAN.noFigure, none: true }];
  }
  return effects.map((effect) =>
    effect.kind === 'exposure'
      ? { label: PLAN.breathedIn, text: describeChange(effect.change), none: false }
      : { label: PLAN.co2, text: formatEffect(effect), none: false },
  );
}

/** The effects a what-if toggle gives, recomputed with the planner's own function. Empty when it gives none. */
export function whatIfEffectsOf(ctx: PlanContext, toggle: WhatIf): Effect[] {
  const result = whatIfEffects(ctx, toggle.patch);
  return result.ok ? result.value : [];
}

/** The toggles that can be recomputed on this page: start times need the forecast curve. */
export function usableToggles(ctx: PlanContext, item: PlanItem): WhatIf[] {
  return item.whatIfs.filter((toggle) => ctx.curve !== null || toggle.patch.op !== 'set_start');
}

/** Sums as the ledger rows draw them. */
export function rowsOf(sums: readonly Sum[]): SumRow[] {
  return sums.map((sum) =>
    sum.none ? { label: sum.label, none: sum.text } : { label: sum.label, figure: sum.text },
  );
}

/** The sums as one sentence for the live region. */
export function sumsSentence(sums: readonly Sum[]): string {
  return sums.map((sum) => `${sum.label}: ${sum.text}`).join('. ');
}

/** What the browser needs to recompute a plan's toggles: the household, the plan's band and date, and the curve. */
export function contextFor(plan: Plan, household: Household, curve: HourCurve | null): PlanContext {
  return { household, band: plan.band, curve, date: plan.date, notBefore: null };
}

/** The people an item is for and how long it takes, in plain words. */
export function whoLine(household: Household, item: PlanItem): string {
  const people = membersOf(household, item.memberIds).map(describeMember).join(', ');
  const activity = activityOf(household, item.activityId);
  return activity ? `${people}, ${String(activity.durationMinutes)} ${PLAN.minutes}` : people;
}

/** Whether the time of an item can move, from the household's own answer; a move says where it came from. */
export function fixityOf(household: Household, item: PlanItem): string {
  const activity = activityOf(household, item.activityId);
  if (item.kind === 'reschedule' && activity) {
    return `${PLAN.from} ${activity.start}`;
  }
  return activity?.timing === 'fixed' ? PLAN.fixed : PLAN.canMove;
}
