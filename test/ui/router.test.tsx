// Tests for views by address: reading ?view=, moving with history entries, and following the back button.
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { hrefFor, RouterProvider, useRoute, viewFromSearch } from '../../src/ui/router.js';

function Where(): ReactElement {
  const { view, moves, navigate } = useRoute();
  return (
    <>
      <p>
        {view} after {moves}
      </p>
      <button
        type="button"
        onClick={() => {
          navigate('plan');
        }}
      >
        Plan
      </button>
    </>
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('addresses', () => {
  it('reads the view from the query and writes links back', () => {
    expect(viewFromSearch('?view=plan')).toBe('plan');
    expect(viewFromSearch('')).toBe('home');
    expect(viewFromSearch('?view=')).toBe('home');
    expect(hrefFor('compare')).toBe('?view=compare');
    expect(hrefFor('home')).toBe('./');
  });
});

describe('RouterProvider', () => {
  it('starts at the view in the address without counting a move', () => {
    window.history.replaceState(null, '', '/?view=community');
    render(
      <RouterProvider>
        <Where />
      </RouterProvider>,
    );
    expect(screen.getByText('community after 0')).toBeInTheDocument();
  });

  it('adds a history entry on a move and follows the back button', async () => {
    render(
      <RouterProvider>
        <Where />
      </RouterProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }));
    expect(window.location.search).toBe('?view=plan');
    expect(screen.getByText('plan after 1')).toBeInTheDocument();
    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('home after 2')).toBeInTheDocument();
  });

  it('reports the first screen and ignores moves outside the provider', async () => {
    render(<Where />);
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }));
    expect(screen.getByText('home after 0')).toBeInTheDocument();
  });
});
