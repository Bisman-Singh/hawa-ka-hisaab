// Tests for the error boundary: it catches a failing view and recovers on retry.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../../src/ui/components/ErrorBoundary.js';

const state = { broken: true };

function Flaky(): ReactElement {
  if (state.broken) {
    throw new Error('view failed');
  }
  return <p>Plan loaded</p>;
}

describe('ErrorBoundary', () => {
  it('shows its children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>Plan loaded</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Plan loaded')).toBeInTheDocument();
  });

  it('replaces a failing view with an alert and brings it back on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    state.broken = true;
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This part of the page stopped working.');
    expect(screen.queryByText('view failed')).not.toBeInTheDocument();
    state.broken = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Plan loaded')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says a connection is needed when the browser is offline, and keeps the household words when online', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    state.broken = true;
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { unmount } = render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This page needs a connection to load. Try again when you are back online.',
    );
    unmount();
    online.mockReturnValue(true);
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Your household and place are still saved.');
  });
});
