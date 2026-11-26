// Tests for the sheet: a labelled modal dialog that closes on its button and returns focus to the opener.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogSheet } from '../../../src/ui/components/DialogSheet.js';
import { axeViolations, fakeDialog } from '../helpers.js';

function Plan(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="linkbtn"
        onClick={() => {
          setOpen(true);
        }}
      >
        How this was made
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
        }}
      >
        Shut from outside
      </button>
      <DialogSheet
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="How this was made"
      >
        <p>The model chose and worded the steps.</p>
      </DialogSheet>
      <p>{open ? 'open' : 'shut'}</p>
    </>
  );
}

beforeEach(() => {
  fakeDialog();
});

describe('DialogSheet', () => {
  it('opens labelled by its heading, closes on Close and gives focus back', async () => {
    const { container } = render(<Plan />);
    const opener = screen.getByRole('button', { name: 'How this was made' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'How this was made' });
    expect(dialog).toHaveAttribute('open');
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(opener).toHaveFocus();
    expect(screen.getByText('shut')).toBeInTheDocument();
  });

  it('closes when its owner sets open to false', async () => {
    render(<Plan />);
    await userEvent.click(screen.getByRole('button', { name: 'How this was made' }));
    const dialog = screen.getByRole('dialog', { hidden: true });
    screen.getByRole('button', { name: 'Shut from outside', hidden: true }).click();
    await screen.findByText('shut');
    expect(dialog).not.toHaveAttribute('open');
  });
  it('closes without moving focus when the opener cannot take it back', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(
      <>
        <svg tabIndex={0} aria-label="Chart" />
        <DialogSheet open={false} onClose={onClose} title="How this was made">
          <p>Facts sent to the model.</p>
        </DialogSheet>
      </>,
    );
    const chart = container.querySelector('svg');
    chart?.focus();
    rerender(
      <>
        <svg tabIndex={0} aria-label="Chart" />
        <DialogSheet open onClose={onClose} title="How this was made">
          <p>Facts sent to the model.</p>
        </DialogSheet>
      </>,
    );
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(chart);
  });
});
