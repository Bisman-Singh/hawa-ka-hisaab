// The struck-through line a moved activity leaves at its usual time, carried to the time it moved to.
import type { ReactElement } from 'react';
import type { Activity } from '../../features/household/types.js';
import { activityName, capitalise } from '../../features/planner/text.js';
import type { PlanItem } from '../../features/planner/types.js';
import { LedgerEntry } from '../components/Ledger.js';
import { PLAN } from './strings.js';

/** Where a moved activity was: its usual time and name, struck through, with the time it moved to. */
export function MovedEntry({
  item,
  activity,
}: {
  readonly item: PlanItem;
  readonly activity: Activity;
}): ReactElement {
  return (
    <LedgerEntry
      time={activity.start}
      fixity={PLAN.canMove}
      title={capitalise(activityName(activity))}
      moved={`${PLAN.movedTo} ${item.start ?? ''}`}
    />
  );
}
