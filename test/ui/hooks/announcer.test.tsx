// Tests for the live region: announcements land in a polite status region, and repeats become new nodes.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Announcer, useAnnounce } from '../../../src/ui/hooks/announcer.js';

function Say(): ReactElement {
  const announce = useAnnounce();
  return (
    <button
      type="button"
      onClick={() => {
        announce('School ride by cycle. No CO2.');
      }}
    >
      Cycle
    </button>
  );
}

describe('Announcer', () => {
  it('puts each announcement in the status region as a new node', async () => {
    render(
      <Announcer>
        <Say />
      </Announcer>,
    );
    const region = screen.getByRole('status');
    await userEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    const first = region.firstElementChild;
    expect(region).toHaveTextContent('School ride by cycle. No CO2.');
    await userEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    expect(region.firstElementChild).not.toBe(first);
    expect(region).toHaveTextContent('School ride by cycle. No CO2.');
  });

  it('does nothing outside the frame', async () => {
    render(<Say />);
    await userEvent.click(screen.getByRole('button', { name: 'Cycle' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
