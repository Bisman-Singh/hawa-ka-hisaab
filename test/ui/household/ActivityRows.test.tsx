// Tests for the outings block: who goes, what, a short description kept as null when empty, add with focus,
// removal with undo, and the problem when nobody goes.
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActivityRows } from '../../../src/ui/household/ActivityRows.js';
import { emptyDraft, toDraft } from '../../../src/ui/household/draft.js';
import { sampleHousehold } from '../../support/samples.js';
import { axeViolations } from '../helpers.js';
import { renderForm } from './harness.js';

describe('ActivityRows', () => {
  it('adds an outing for the first person, moves focus to who goes, and writes edits back', async () => {
    const { draft, container } = renderForm(emptyDraft(), (form) => <ActivityRows form={form} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add an outing' }));
    const row = screen.getByRole('group', { name: 'Outing 1, Something else' });
    await waitFor(() => {
      expect(within(row).getByRole('checkbox', { name: 'Person 1, adult' })).toHaveFocus();
    });
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: 'What' }), 'School run');
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: 'Where' }), 'On the way');
    await userEvent.type(within(row).getByRole('textbox', { name: 'In a few words' }), 'school');
    expect(draft()?.activities[0]).toMatchObject({
      kind: 'school_run',
      setting: 'in_transit',
      label: 'school',
    });
    expect(screen.getByRole('group', { name: 'Outing 1, school' })).toBeInTheDocument();
    await userEvent.clear(within(row).getByRole('textbox', { name: 'In a few words' }));
    expect(draft()?.activities[0]?.label).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('asks who goes when nobody is ticked', async () => {
    const start = toDraft(sampleHousehold());
    renderForm(start, (form) => <ActivityRows form={form} />);
    const row = screen.getAllByRole('group', { name: /^Outing 1/ })[0] ?? document.body;
    for (const box of within(row).getAllByRole('checkbox', { checked: true })) {
      await userEvent.click(box);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(within(row).getByRole('group', { name: 'Who goes' })).toHaveAccessibleDescription(
      'Tick who goes.',
    );
  });

  it('removes an outing with an undo that brings it back', async () => {
    const start = toDraft(sampleHousehold());
    const { draft } = renderForm(start, (form) => <ActivityRows form={form} />);
    await userEvent.click(screen.getAllByRole('button', { name: /^Remove Outing 1/ })[0] ?? document.body);
    expect(draft()?.activities).toHaveLength(start.activities.length - 1);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(draft()?.activities).toEqual(start.activities);
  });
});
