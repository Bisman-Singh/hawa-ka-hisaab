// Tests for the disclosure: native details, the default summary, and keyboard toggling.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Disclosure } from '../../../src/ui/components/Disclosure.js';
import { axeViolations } from '../helpers.js';

describe('Disclosure', () => {
  it('shows the working when the summary is activated and hides it again', async () => {
    const { container } = render(
      <Disclosure>
        <p>3 km × 0.10768 kg per km ÷ 3 riders</p>
      </Disclosure>,
    );
    const details = container.querySelector('details');
    const summary = screen.getByText('Show the working');
    await userEvent.click(summary);
    expect(details).toHaveAttribute('open');
    await userEvent.click(summary);
    expect(details).not.toHaveAttribute('open');
    expect(container.querySelector('.sheet')).toHaveTextContent('0.10768');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('can start open with its own summary', () => {
    const { container } = render(
      <Disclosure summary="Inputs" open>
        <p>Ride of 3 km.</p>
      </Disclosure>,
    );
    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByText('Inputs')).toBeInTheDocument();
  });
});
