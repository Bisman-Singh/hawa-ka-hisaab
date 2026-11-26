// Turns a drafted action for one activity into a candidate with a stable id, slot and clock time.
import type { Activity } from '../household/types.js';
import { clockOf } from '../ledger/format.js';
import type { Effect } from '../ledger/types.js';
import { slotOf } from './effects.js';
import type { ActionKind, ActionText, CandidateAction, WhatIf } from './types.js';

/** The parts of a candidate that differ from rule to rule. start is in minutes after midnight. */
export interface Draft {
  readonly kind: ActionKind;
  readonly prefix: string;
  readonly start: number;
  readonly effects: readonly Effect[];
  readonly factIds: readonly string[];
  readonly template: ActionText;
  readonly whatIfs: readonly WhatIf[];
}

/** Each value once, in first-seen order. */
export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/** A candidate for this activity. Its id is the prefix and the activity id, such as move-a2. */
export function candidateFor(activity: Activity, draft: Draft): CandidateAction {
  return {
    id: `${draft.prefix}-${activity.id}`,
    kind: draft.kind,
    slot: slotOf(draft.start),
    activityId: activity.id,
    memberIds: [...activity.memberIds],
    start: clockOf(draft.start),
    effects: [...draft.effects],
    factIds: unique(draft.factIds).slice(0, 12),
    template: draft.template,
    whatIfs: [...draft.whatIfs],
  };
}
