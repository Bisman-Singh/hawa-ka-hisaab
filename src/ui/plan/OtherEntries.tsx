// The struck-through line a moved activity leaves at its usual time, carried to the time it moved to.
import type { ReactElement } from 'react';
import type { Activity } from '../../features/household/types.js';
import { fill } from '../../features/ledger/display-words.js';
import type { PlanItem } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { LedgerEntry } from '../components/Ledger.js';
import { PLAN_LABELS } from './labels.js';

/** Props of a moved entry: the move, the activity, its title in the plan's language, and that language. */
export interface MovedEntryProps {
  readonly item: PlanItem;
  readonly activity: Activity;
  readonly title: string;
  readonly language: Language;
}

/** Where a moved activity was: its usual time and name, struck through, with the time it moved to. */
export function MovedEntry({ item, activity, title, language }: MovedEntryProps): ReactElement {
  const words = PLAN_LABELS[language];
  return (
    <LedgerEntry
      time={activity.start}
      fixity={words.canMove}
      title={title}
      moved={fill(words.movedTo, { time: item.start ?? '' })}
    />
  );
}
