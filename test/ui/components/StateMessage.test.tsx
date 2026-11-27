// Tests for state messages: alert and status roles, the quiet edge, the heading level and a hidden glyph.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StateMessage } from '../../../src/ui/components/StateMessage.js';
import { axeViolations } from '../helpers.js';

describe('StateMessage', () => {
  it('raises an alert with a heading, body and action', async () => {
    const { container } = render(
      <StateMessage tone="alert" glyph="feed" title="The air reading could not be fetched">
        <p>The CPCB feed did not answer within 8 seconds.</p>
        <button type="button">Try again</button>
      </StateMessage>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('msg');
    expect(alert).not.toHaveClass('quiet');
    expect(
      screen.getByRole('heading', { level: 3, name: 'The air reading could not be fetched' }),
    ).toBeInTheDocument();
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('shows a quiet status at the level asked, with no live region of its own', () => {
    const { container } = render(
      <StateMessage tone="status" glyph="offline" title="You are offline" quiet level={2} />,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.firstElementChild).toHaveClass('msg', 'quiet');
    expect(screen.getByRole('heading', { level: 2, name: 'You are offline' })).toBeInTheDocument();
  });
});
