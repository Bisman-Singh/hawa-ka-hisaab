// Tests for moving focus after a render.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { useFocusLater } from '../../../src/ui/hooks/focus.js';

function Harness(): ReactElement {
  const focusLater = useFocusLater();
  const [shown, setShown] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShown(true);
          focusLater('late');
        }}
      >
        Show
      </button>
      <button
        type="button"
        onClick={() => {
          focusLater('missing');
        }}
      >
        Nowhere
      </button>
      {shown ? <input id="late" aria-label="Late" /> : null}
    </>
  );
}

describe('useFocusLater', () => {
  it('focuses an element that appears in the same change, again on each call, and ignores a missing id', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('textbox', { name: 'Late' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Nowhere' }));
    expect(screen.getByRole('button', { name: 'Nowhere' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('textbox', { name: 'Late' })).toHaveFocus();
  });
});
