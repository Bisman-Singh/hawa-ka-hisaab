// Tests for waiting states: hidden skeleton lines and steps read out politely as they change.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressSteps, Skeleton } from '../../../src/ui/components/Progress.js';
import { axeViolations } from '../helpers.js';

describe('waiting states', () => {
  it('draws skeleton lines hidden from screen readers', () => {
    const { container } = render(
      <>
        <Skeleton size="w60" />
        <Skeleton size="w45" tall />
      </>,
    );
    const lines = container.querySelectorAll('.skel');
    expect(lines[0]).toHaveClass('skel', 'w60');
    expect(lines[1]).toHaveClass('skel', 'w45', 'tall');
    expect(lines[1]).toHaveAttribute('aria-hidden', 'true');
  });

  it('lists finished steps as Done and the current one as Now in a polite region', async () => {
    const { container } = render(
      <ProgressSteps
        steps={[
          { label: 'Read the air for Preet Vihar', state: 'done' },
          { label: 'Choosing and wording the steps', state: 'now' },
        ]}
      />,
    );
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-live', 'polite');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'DoneRead the air for Preet Vihar',
      'NowChoosing and wording the steps',
    ]);
    expect(screen.getAllByRole('listitem')[1]).toHaveClass('now');
    expect(await axeViolations(container)).toEqual([]);
  });
});
