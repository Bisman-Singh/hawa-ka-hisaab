// Tests for the "how this was made" opener: it opens the sheet with the trace and gives focus back on close.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { HowMade } from '../../../src/ui/trace/HowMade.js';
import { axeViolations, fakeDialog } from '../helpers.js';
import { hindiPlanResponse } from '../plan/fixtures.js';

beforeEach(() => {
  fakeDialog();
});

describe('HowMade', () => {
  it('opens the sheet on the trace, closes it and gives focus back to the opener', async () => {
    const { container } = render(
      <HowMade trace={hindiPlanResponse('family-car-asthma', 'very_poor').trace} />,
    );
    const opener = screen.getByRole('button', { name: 'How this was made' });
    expect(container.querySelector('dialog')).not.toHaveAttribute('open');
    await userEvent.click(opener);
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Facts sent to the model' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(document.activeElement).toBe(opener);
  }, 30_000);
});
