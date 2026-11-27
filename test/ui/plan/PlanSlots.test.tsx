// Tests for the slots and the reckoning: the hours each slot covers, an empty slot, and reckoning rows by activity.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlanSlots, Reckoning, slotHours } from '../../../src/ui/plan/PlanSlots.js';
import { sample } from '../../support/plan-fixtures.js';
import { need, planResponse } from './fixtures.js';

describe('slots', () => {
  it('cover the clock from the slot start hours, evening running to the next morning', () => {
    expect(slotHours('morning')).toBe('05:00 to 12:00');
    expect(slotHours('evening')).toBe('17:00 to 05:00');
  });

  it('say so when a part of the day has nothing planned', () => {
    const { plan } = planResponse('older-couple-chulha', 'poor');
    const empty = { ...plan, slots: { morning: [], afternoon: [], evening: [] } };
    render(
      <PlanSlots
        plan={empty}
        household={sample('older-couple-chulha')}
        whatIf={{ curve: null, notBefore: null }}
      />,
    );
    expect(screen.getAllByText('Nothing planned in this part of the day.')).toHaveLength(3);
  });
});

describe('Reckoning', () => {
  it('lists each figure by activity, and by title for an item not tied to one', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const loose = { ...need(plan.slots.morning[1]), activityId: null };
    const changed = { ...plan, slots: { ...plan.slots, morning: [loose] } };
    render(<Reckoning plan={changed} household={sample('family-car-asthma')} />);
    expect(screen.getByText(`${loose.title}, Travel CO₂`)).toBeInTheDocument();
    expect(screen.getByText(/not added across people or trips/)).toBeInTheDocument();
  });
});
