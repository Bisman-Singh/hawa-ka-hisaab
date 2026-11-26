// Morning, afternoon and evening as ledger slots with their entries, then the day's reckoning of every figure.
import type { ReactElement } from 'react';
import { SLOT_START_HOURS } from '../../config/limits.js';
import type { HourCurve } from '../../features/air/types.js';
import type { Household } from '../../features/household/types.js';
import { clockOf } from '../../features/ledger/format.js';
import { activityName, capitalise } from '../../features/planner/text.js';
import type { Plan, Slot } from '../../features/planner/types.js';
import { LedgerSlot } from '../components/Ledger.js';
import { activityOf, contextFor, entriesBySlot, itemsOf, SLOTS, sumsOf } from './plan-data.js';
import type { Entry } from './plan-data.js';
import { MovedEntry } from './OtherEntries.js';
import { ItemEntry } from './PlanEntry.js';
import { PLAN } from './strings.js';

const NEXT: Readonly<Record<Slot, Slot>> = { morning: 'afternoon', afternoon: 'evening', evening: 'morning' };

/** The clock hours a slot covers, such as "05:00 to 12:00". Hours before the morning count as evening. */
export function slotHours(slot: Slot): string {
  return `${clockOf(SLOT_START_HOURS[slot] * 60)} ${PLAN.hoursTo} ${clockOf(SLOT_START_HOURS[NEXT[slot]] * 60)}`;
}

/** Props of the slots: the plan, the household it was made for and the forecast held on this page. */
export interface PlanSlotsProps {
  readonly plan: Plan;
  readonly household: Household;
  readonly curve: HourCurve | null;
}

/** The three slots. An empty slot says so rather than vanishing. */
export function PlanSlots({ plan, household, curve }: PlanSlotsProps): ReactElement {
  const slots = entriesBySlot(plan, household);
  const ctx = contextFor(plan, household, curve);
  const draw = (entry: Entry): ReactElement => {
    return entry.kind === 'moved' ? (
      <MovedEntry key={`moved-${entry.item.candidateId}`} item={entry.item} activity={entry.activity} />
    ) : (
      <ItemEntry
        key={entry.item.candidateId}
        item={entry.item}
        household={household}
        ctx={ctx}
        language={plan.language}
      />
    );
  };
  return (
    <>
      {SLOTS.map((slot) => (
        <LedgerSlot key={slot} title={PLAN.slots[slot]} hours={slotHours(slot)}>
          {slots[slot].length === 0 ? <li className="small">{PLAN.empty}</li> : slots[slot].map(draw)}
        </LedgerSlot>
      ))}
    </>
  );
}

/** The day's reckoning: every figure in the plan by activity, each for one person, never added across people. */
export function Reckoning({
  plan,
  household,
}: {
  readonly plan: Plan;
  readonly household: Household;
}): ReactElement {
  const rows = itemsOf(plan).flatMap((item) => {
    const activity = activityOf(household, item.activityId);
    const name = activity === null ? item.title : capitalise(activityName(activity));
    return sumsOf(item.effects, false).flatMap((sum) =>
      sum.none ? [] : [{ label: `${name}, ${sum.label}`, text: sum.text }],
    );
  });
  const shown = rows.length === 0 ? [{ label: PLAN.reckoningEmpty, text: PLAN.reckoningNo }] : rows;
  return (
    <section className="reckon" aria-label={PLAN.reckoning}>
      <table>
        <caption>{PLAN.reckoning}</caption>
        <tbody>
          {shown.map((row, index) => (
            <tr key={index}>
              <th scope="row">{row.label}</th>
              <td className="num">{row.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">{rows.length === 0 ? PLAN.reckoningNone : PLAN.reckoningNote}</p>
    </section>
  );
}
