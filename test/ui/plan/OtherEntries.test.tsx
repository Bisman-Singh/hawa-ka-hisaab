// Tests for a moved entry: struck through at its usual time with the time it moved to.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MovedEntry } from '../../../src/ui/plan/OtherEntries.js';
import { sample } from '../../support/plan-fixtures.js';
import { need, planResponse } from './fixtures.js';

describe('MovedEntry', () => {
  it('shows the usual time and name struck through and carries the new time', () => {
    const item = need(planResponse('older-couple-chulha', 'poor').plan.slots.afternoon[0]);
    const activity = need(sample('older-couple-chulha').activities[0]);
    const { container, rerender } = render(
      <ol>
        <MovedEntry item={item} activity={activity} />
      </ol>,
    );
    expect(container.querySelector('li')).toHaveClass('moved');
    expect(screen.getByText('Moved to 14:00')).toBeInTheDocument();
    expect(screen.getByText('07:00')).toBeInTheDocument();
    rerender(
      <ol>
        <MovedEntry item={{ ...item, start: null }} activity={activity} />
      </ol>,
    );
    expect(screen.getByText('Moved to')).toBeInTheDocument();
  });
});
