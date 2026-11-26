// Tests for the failure state: plain words for the failure, the right glyph and a retry that works.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RequestFailure } from '../../../src/ui/components/RequestFailure.js';
import { axeViolations } from '../helpers.js';

describe('RequestFailure', () => {
  it('names a lost connection and retries on request', async () => {
    const retry = vi.fn();
    const { container } = render(<RequestFailure failure={{ kind: 'network' }} retry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No connection');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('No connection');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('names a server failure at the level asked', () => {
    render(<RequestFailure failure={{ kind: 'http', status: 502 }} retry={() => undefined} level={2} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'The server did not answer properly' }),
    ).toBeInTheDocument();
  });
});
