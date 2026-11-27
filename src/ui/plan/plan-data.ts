// Pure helpers for the plan screens: where each entry sits in the day and the sums beside it, in the plan's
// language. Every figure is laid out by the ledger, and what-if sums come from the planner.
import { isVulnerable, membersOf } from '../../features/household/members.js';
import type { Activity, Household } from '../../features/household/types.js';
import { effectDisplay } from '../../features/ledger/display.js';
import { minutesOf } from '../../features/ledger/format.js';
import type { Effect } from '../../features/ledger/types.js';
import type { PlanContext } from '../../features/planner/context.js';
import { slotOf } from '../../features/planner/effects.js';
import type { Language } from '../../lib/types.js';
import type {
  Plan,
  PlanItem,
  PlanResponse,
  Slot,
  WhatIf,
  WhatIfContext,
} from '../../features/planner/types.js';
import { whatIfEffects } from '../../features/planner/what-if.js';
import type { SumRow } from '../components/Ledger.js';
import { PLAN_LABELS } from './labels.js';

/**
 * A sum beside an entry: the headline figure, its range or basis line, the reason a range is wide or null, and one
 * plain sentence to read out. none marks the reason there is no figure, with no detail.
 */
export interface Sum {
  readonly label: string;
  readonly text: string;
  readonly detail: string;
  readonly note: string | null;
  readonly sentence: string;
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

/**
 * The sums for a list of effects, laid out by the ledger in the given language. A range that could be a cut or a
 * rise is headlined by its rise, never as a saving. With no effect, why there is no figure.
 */
export function sumsOf(effects: readonly Effect[], mild: boolean, language: Language = 'en'): Sum[] {
  const words = PLAN_LABELS[language];
  if (effects.length === 0) {
    const text = mild ? words.noneNeeded : words.noFigure;
    return [
      { label: words.effect, text, detail: '', note: null, sentence: `${words.effect}: ${text}`, none: true },
    ];
  }
  return effects.map((effect): Sum => {
    const { headline, detail, note, sentence } = effectDisplay(effect, language);
    const label = effect.kind === 'exposure' ? words.breathedIn : words.co2;
    return { label, text: headline, detail, note, sentence, none: false };
  });
}

/** The reasons the sums' ranges are wide, each once. */
export function notesOf(sums: readonly Sum[]): string[] {
  return [...new Set(sums.flatMap((sum) => (sum.note === null ? [] : [sum.note])))];
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

/** Sums as the ledger rows draw them: the figure, then its range or basis on a second line. */
export function rowsOf(sums: readonly Sum[]): SumRow[] {
  return sums.map((sum) =>
    sum.none
      ? { label: sum.label, none: sum.text }
      : { label: sum.label, figure: sum.text, range: sum.detail },
  );
}

/** The sums in plain sentences for the live region and screen readers. */
export function sumsSentence(sums: readonly Sum[]): string {
  return sums.map((sum) => sum.sentence).join(' ');
}

/** The forecast curve and earliest move time the server planned with. A response without them gives neither. */
export function whatIfOf(response: PlanResponse): WhatIfContext {
  return response.whatIfContext ?? { curve: null, notBefore: null };
}

/**
 * What the browser needs to recompute a plan's toggles as the server would: the household, the plan's band and
 * date, and the server's own curve and earliest move time, never the browser's clock or another forecast.
 */
export function contextFor(plan: Plan, household: Household, whatIf: WhatIfContext): PlanContext {
  return { household, band: plan.band, curve: whatIf.curve, date: plan.date, notBefore: whatIf.notBefore };
}
