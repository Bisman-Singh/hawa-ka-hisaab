// Tests for the form state: ids and problems by path, save with focus on the first problem or the plan, removal
// with undo, and an edit that ends the chance to undo.
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { emptyDraft, toDraft } from '../../../src/ui/household/draft.js';
import type { Removal } from '../../../src/ui/household/useHouseholdForm.js';
import { sampleHousehold } from '../../support/samples.js';
import { renderForm, spoken } from './harness.js';

describe('useHouseholdForm', () => {
  it('saves a valid form, says so and moves focus to the plan button once it exists', async () => {
    const { onSave, form } = renderForm(emptyDraft(), (state) =>
      state.saved ? (
        <button type="button" id={state.ids.plan}>
          Plan
        </button>
      ) : null,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSave).toHaveBeenCalledWith(emptyDraft());
    expect(form()?.saved).toBe(true);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Plan' })).toHaveFocus();
    });
    expect(spoken()).toBe('Household saved.');
  });

  it('gives each field its problem, counts them and moves focus to the first', async () => {
    const draft = toDraft(sampleHousehold());
    const broken = {
      ...draft,
      activities: draft.activities.map((activity) => ({ ...activity, minutes: '' })),
    };
    const { form, onSave } = renderForm(broken, (state) => (
      <input aria-label="Minutes" id={state.at('activities', 0, 'durationMinutes').id} />
    ));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(form()?.at('activities', 0, 'durationMinutes').error).toBe('Enter the minutes, from 5 to 720.');
    expect(form()?.problems).toBe(draft.activities.length);
    expect(screen.getByRole('textbox', { name: 'Minutes' })).toHaveFocus();
    expect(spoken()).toBe(`${String(draft.activities.length)} fields need a fix. The first is in focus.`);
  });

  it('keeps a removal for undo until the next edit, and undo brings the draft back', () => {
    const start = toDraft(sampleHousehold());
    const { form, draft } = renderForm(start, (state) => (
      <>
        <input aria-label="Back" id="back" />
        {state.removed ? (
          <button type="button" id={state.ids.undo}>
            Undo
          </button>
        ) : null}
      </>
    ));
    const removal: Removal = {
      block: 'members',
      said: 'Person 2 removed.',
      next: emptyDraft(),
      back: 'back',
    };
    act(() => {
      form()?.remove(removal);
    });
    expect(draft()).toEqual(emptyDraft());
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    expect(spoken()).toBe('Person 2 removed.');
    const gone = form()?.removed;
    act(() => {
      if (gone) {
        form()?.restore(gone);
      }
    });
    expect(draft()).toEqual(start);
    expect(screen.getByRole('textbox', { name: 'Back' })).toHaveFocus();
    act(() => {
      form()?.remove(removal);
    });
    act(() => {
      form()?.edit(start);
    });
    expect(form()?.removed).toBeNull();
  });
});
