// Morning, afternoon and evening as ledger slots with their entries, then the day's reckoning of every figure, all
// labelled in the plan's language. A Hindi plan says once that the health ministry's words are rendered in Hindi.
import type { ReactElement } from 'react';
import { SLOT_START_HOURS } from '../../config/limits.js';
import type { Household } from '../../features/household/types.js';
import { fill } from '../../lib/template.js';
import { clockOf } from '../../lib/time.js';
import type { Plan, Slot, WhatIfContext } from '../../features/planner/types.js';
import { HINDI_ADVICE_NOTE } from '../../features/planner/words-lexicon.js';
import type { Language } from '../../lib/types.js';
import { LedgerSlot, TotalTable } from '../components/Ledger.js';
import { contextFor, entriesBySlot, type Entry, SLOTS, sumsOf } from './plan-data.js';
import { planItems } from '../../features/planner/assemble.js';
import { activityTitle } from './plan-words.js';
import { MovedEntry } from './OtherEntries.js';
import { ItemEntry } from './PlanEntry.js';
import { PLAN_LABELS } from './words.js';

const NEXT: Readonly<Record<Slot, Slot>> = { morning: 'afternoon', afternoon: 'evening', evening: 'morning' };

/** The clock hours a slot covers, such as "05:00 to 12:00". Hours before the morning count as evening. */
export function slotHours(slot: Slot, language: Language = 'en'): string {
  const hour = (at: Slot): string => clockOf(SLOT_START_HOURS[at] * 60);
  return fill(PLAN_LABELS[language].hoursRange, { from: hour(slot), to: hour(NEXT[slot]) });
}

/** Props of the slots: the plan, the household it was made for and the forecast and time it was made with. */
export interface PlanSlotsProps {
  readonly plan: Plan;
  readonly household: Household;
  readonly whatIf: WhatIfContext;
}

/** The three slots. An empty slot says so rather than vanishing. */
export function PlanSlots({ plan, household, whatIf }: PlanSlotsProps): ReactElement {
  const { language } = plan;
  const words = PLAN_LABELS[language];
  const slots = entriesBySlot(plan, household);
  const ctx = contextFor(plan, household, whatIf);
  const draw = (entry: Entry): ReactElement =>
    entry.kind === 'moved' ? (
      <MovedEntry
        key={`moved-${entry.item.candidateId}`}
        item={entry.item}
        activity={entry.activity}
        title={activityTitle(household, entry.activity, language)}
        language={language}
      />
    ) : (
      <ItemEntry
        key={entry.item.candidateId}
        item={entry.item}
        household={household}
        ctx={ctx}
        language={language}
      />
    );
  return (
    <div lang={language}>
      {SLOTS.map((slot) => (
        <LedgerSlot key={slot} title={words.slots[slot]} hours={slotHours(slot, language)}>
          {slots[slot].length === 0 ? <li className="small">{words.empty}</li> : slots[slot].map(draw)}
        </LedgerSlot>
      ))}
    </div>
  );
}

/** The day's reckoning: every figure in the plan by step, each for one person, never added across people. */
export function Reckoning({ plan }: { readonly plan: Plan }): ReactElement {
  const { language } = plan;
  const words = PLAN_LABELS[language];
  const rows = planItems(plan).flatMap((item) =>
    sumsOf(item.effects, false, language).flatMap((sum) =>
      sum.none ? [] : [{ label: `${item.title}, ${sum.label}`, value: sum.text }],
    ),
  );
  const shown = rows.length === 0 ? [{ label: words.reckoningEmpty, value: words.reckoningNo }] : rows;
  return (
    <TotalTable caption={words.reckoning} rows={shown} lang={language}>
      <p className="note">{rows.length === 0 ? words.reckoningNone : words.reckoningNote}</p>
      {language === 'hi' ? <p className="note">{HINDI_ADVICE_NOTE}</p> : null}
    </TotalTable>
  );
}
