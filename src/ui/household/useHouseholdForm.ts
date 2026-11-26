// The household form's state: the working copy, problems by field, the last removal for undo and the saved mark.
// Focus follows each action: a new row's first field, the Undo button, the restored row, the first problem, the plan.
import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import type { Household } from '../../features/household/types.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useFocusLater } from '../place/focus.js';
import { checkDraft, fieldKey } from './draft.js';
import type { Draft } from './draft.js';
import { FORM } from './strings.js';

/** The id and problem of the field at a path in the household. */
export interface FieldAt {
  readonly id: string;
  readonly error: string | undefined;
}

/** Finds a field by its path, such as at('activities', 0, 'start'). */
export type At = (...path: readonly (string | number)[]) => FieldAt;

/** Where a removal or replacement happened, the sentence that says so, the draft after it and the field to focus on undo. */
export interface Removal {
  readonly block: 'members' | 'activities' | 'rooms' | 'sample';
  readonly said: string;
  readonly next: Draft;
  readonly back: string;
}

/** A removal with the draft from before it, which Undo brings back. */
export interface Removed extends Removal {
  readonly before: Draft;
}

/** Everything the form and its blocks use. */
export interface HouseholdFormState {
  readonly draft: Draft;
  readonly at: At;
  readonly ids: { readonly undo: string; readonly plan: string };
  readonly edit: (next: Draft) => void;
  readonly add: (next: Draft, focus: string) => void;
  readonly remove: (removal: Removal) => void;
  readonly removed: Removed | null;
  readonly restore: (removed: Removed) => void;
  readonly submit: (event: SubmitEvent) => void;
  readonly saved: boolean;
  readonly problems: number;
}

type Apply = (next: Draft) => void;

function useSave(draft: Draft, onSave: (household: Household) => void, idOf: (key: string) => string) {
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [saved, setSaved] = useState(false);
  const focusLater = useFocusLater();
  const announce = useAnnounce();
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const checked = checkDraft(draft);
    setErrors(checked.ok ? {} : checked.errors);
    setSaved(checked.ok);
    if (checked.ok) {
      onSave(checked.household);
      announce(FORM.savedSay);
    } else {
      announce(FORM.fix(Object.keys(checked.errors).length));
    }
    focusLater(idOf(checked.ok ? 'plan' : checked.first));
  };
  return { errors, saved, setSaved, submit };
}

function useUndo(draft: Draft, apply: Apply, undoId: string) {
  const [removed, setRemoved] = useState<Removed | null>(null);
  const focusLater = useFocusLater();
  const announce = useAnnounce();
  const remove = (removal: Removal): void => {
    apply(removal.next);
    setRemoved({ ...removal, before: draft });
    focusLater(undoId);
    announce(removal.said);
  };
  const restore = (gone: Removed): void => {
    apply(gone.before);
    setRemoved(null);
    focusLater(gone.back);
    announce(FORM.undone);
  };
  return { removed, remove, restore, clear: setRemoved };
}

/** The form state, starting from a draft. onSave gets the checked household. */
export function useHouseholdForm(initial: Draft, onSave: (household: Household) => void): HouseholdFormState {
  const prefix = useId();
  const idOf = (key: string): string => `${prefix}-${key}`;
  const [draft, setDraft] = useState(initial);
  const { errors, saved, setSaved, submit } = useSave(draft, onSave, idOf);
  const apply: Apply = (next) => {
    setDraft(next);
    setSaved(false);
  };
  const { removed, remove, restore, clear } = useUndo(draft, apply, idOf('undo'));
  const focusLater = useFocusLater();
  const edit: Apply = (next) => {
    apply(next);
    clear(null);
  };
  const add = (next: Draft, focus: string): void => {
    edit(next);
    focusLater(focus);
  };
  const at: At = (...path) => ({ id: idOf(fieldKey(path)), error: errors[fieldKey(path)] });
  const ids = { undo: idOf('undo'), plan: idOf('plan') };
  const problems = Object.keys(errors).length;
  return { draft, at, ids, edit, add, remove, removed, restore, submit, saved, problems };
}
