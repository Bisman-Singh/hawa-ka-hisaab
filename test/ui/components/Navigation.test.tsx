// Tests for view links and headings: a plain click moves in the page, a modified click is left to the browser,
// and the new view's heading takes focus after a move but not on first load.
import { fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ViewHeading, ViewLink } from '../../../src/ui/components/Navigation.js';
import { useRoute } from '../../../src/ui/router.js';
import { axeViolations, renderInApp } from '../helpers.js';

function Views(): ReactElement {
  const { view } = useRoute();
  return (
    <>
      <ViewLink to="plan">{"Today's plan"}</ViewLink>
      <ViewLink to="home" className="wordmark">
        Start
      </ViewLink>
      {view === 'plan' ? (
        <ViewHeading>{"Today's plan"}</ViewHeading>
      ) : (
        <ViewHeading hidden>Your place</ViewHeading>
      )}
    </>
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('ViewLink and ViewHeading', () => {
  it('moves on a plain click and focuses the new heading', async () => {
    const { container } = renderInApp(<Views />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your place' })).toHaveClass('vh');
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
    const link = screen.getByRole('link', { name: "Today's plan" });
    expect(link).toHaveAttribute('href', '?view=plan');
    await userEvent.click(link);
    expect(window.location.search).toBe('?view=plan');
    expect(screen.getByRole('heading', { level: 1, name: "Today's plan" })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Start' })).toHaveClass('wordmark');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('leaves a modified click to the browser', () => {
    renderInApp(<Views />);
    const link = screen.getByRole('link', { name: "Today's plan" });
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { button: 1 });
    expect(window.location.search).toBe('');
    expect(screen.getByRole('heading', { level: 1, name: 'Your place' })).toBeInTheDocument();
  });
});
