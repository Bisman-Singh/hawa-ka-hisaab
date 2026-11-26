// Tests for the shared row parts: a Remove button that says what it removes, the undo line only in its own block,
// and an Add button that stops at the limit.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { emptyDraft } from '../../../src/ui/household/draft.js';
import { AddButton, RowTitle, UndoLine } from '../../../src/ui/household/rows.js';
import { renderForm } from './harness.js';

describe('row parts', () => {
  it('names the row in its Remove button', async () => {
    const onRemove = vi.fn();
    render(<RowTitle id="t" title="Room 1, Bedroom" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Room 1, Bedroom' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows the undo line only in the block where the removal happened', async () => {
    const { form } = renderForm(emptyDraft(), (state) => (
      <>
        <UndoLine form={state} block="rooms" />
        <UndoLine form={state} block="members" />
        <button
          type="button"
          onClick={() => {
            state.remove({
              block: 'members',
              said: 'Person 1 removed.',
              next: { ...emptyDraft(), members: [] },
              back: 'x',
            });
          }}
        >
          Drop
        </button>
      </>
    ));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Drop' }));
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);
    expect(screen.getByText('Person 1 removed.', { selector: 'p.status' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(form()?.draft.members).toHaveLength(1);
  });

  it('disables Add once the block is full', () => {
    render(<AddButton label="Add a room" full onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add a room' })).toBeDisabled();
  });
});
