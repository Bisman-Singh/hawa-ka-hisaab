// Tests for moving focus after a render.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { useFocusLater, useRescueFocus, VIEW_TITLE } from '../../../src/ui/hooks/focus.js';

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

function Rescue({ target }: { readonly target?: string }): ReactElement {
  const [step, setStep] = useState(0);
  useRescueFocus(String(step), ...(target === undefined ? [] : [target]));
  return (
    <>
      <h1 id={VIEW_TITLE} tabIndex={-1}>
        Title
      </h1>
      <p id="elsewhere" tabIndex={-1}>
        Elsewhere
      </p>
      {step === 0 ? (
        <button
          type="button"
          onClick={() => {
            setStep(1);
          }}
        >
          Go
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setStep(step + 1);
        }}
      >
        Keep
      </button>
    </>
  );
}

describe('useRescueFocus', () => {
  it('does nothing on the first render, and moves focus to the heading when the pressed button is gone', async () => {
    render(<Rescue />);
    expect(document.body).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('heading', { name: 'Title' })).toHaveFocus();
  });

  it('leaves focus alone while it sits on a control that is still there', async () => {
    render(<Rescue />);
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus();
  });

  it('can name another element to take focus', async () => {
    render(<Rescue target="elsewhere" />);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(document.getElementById('elsewhere')).toHaveFocus();
  });
});
