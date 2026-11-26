// Tests for the people block: no name field, edits, add with focus on the new row, removal with undo, and the
// problem when nobody is left.
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { emptyDraft, toDraft } from '../../../src/ui/household/draft.js';
import { MemberRows } from '../../../src/ui/household/MemberRows.js';
import { sampleHousehold } from '../../support/samples.js';
import { axeViolations } from '../helpers.js';
import { renderForm, spoken } from './harness.js';

describe('MemberRows', () => {
  it('describes each person by age and flags only, and writes edits back', async () => {
    const { draft, container } = renderForm(emptyDraft(), (form) => <MemberRows form={form} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('No names needed. Describe each person by age and health.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Age group' }), '60 and over');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Heart condition' }));
    expect(draft()?.members).toEqual([{ id: 'm1', ageGroup: 'older_adult', flags: ['heart_condition'] }]);
    expect(
      screen.getByRole('group', { name: 'Person 1, older adult with a heart condition' }),
    ).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('adds a person and moves focus to their age group', async () => {
    const { draft } = renderForm(emptyDraft(), (form) => <MemberRows form={form} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add a person' }));
    expect(draft()?.members.map((member) => member.id)).toEqual(['m1', 'm2']);
    await waitFor(() => {
      expect(screen.getAllByRole('combobox', { name: 'Age group' })[1]).toHaveFocus();
    });
  });

  it('removes a person with an undo that takes focus and brings them back', async () => {
    const { draft } = renderForm(toDraft(sampleHousehold()), (form) => <MemberRows form={form} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Person 2, adult who works outdoors' }));
    expect(draft()?.members.map((member) => member.id)).toEqual(['m1', 'm3', 'm4']);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    expect(spoken()).toBe('Person 2 removed.');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(draft()?.members.map((member) => member.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    await waitFor(() => {
      expect(screen.getAllByRole('combobox', { name: 'Age group' })[1]).toHaveFocus();
    });
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('asks for at least one person on save, on the Add button that takes focus', async () => {
    renderForm(emptyDraft(), (form) => <MemberRows form={form} />);
    await userEvent.click(screen.getByRole('button', { name: /Remove Person 1/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    const add = screen.getByRole('button', { name: 'Add a person' });
    expect(add).toHaveAccessibleDescription('Add at least one person.');
    await waitFor(() => {
      expect(add).toHaveFocus();
    });
  });
});
