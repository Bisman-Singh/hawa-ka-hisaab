// Tests for the slots and the reckoning: the hours each slot covers, an empty slot, and reckoning rows by step.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlanSlots, Reckoning, slotHours } from '../../../src/ui/plan/PlanSlots.js';
import { sample } from '../../support/plan-fixtures.js';
import { planResponse } from './fixtures.js';

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
  it('lists each figure by the step it belongs to, so two steps for one activity read apart', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    render(<Reckoning plan={plan} />);
    expect(screen.getByText('Office commute: windows up, AC on, Breathed in')).toBeInTheDocument();
    expect(screen.getByText('Office commute: take the bus, Breathed in')).toBeInTheDocument();
    expect(screen.getByText('Office commute: take the bus, Travel CO₂')).toBeInTheDocument();
    expect(screen.getByText(/not added across people or trips/)).toBeInTheDocument();
  });

  it('says there is nothing to add up when no step has a figure, in the plan language', () => {
    const { plan } = planResponse('family-car-asthma', 'good', { language: 'hi' });
    render(<Reckoning plan={{ ...plan, slots: { morning: [], afternoon: [], evening: [] } }} />);
    expect(screen.getByRole('table', { name: 'दिन का हिसाब' })).toBeInTheDocument();
    expect(screen.getByText('मापे हुए आँकड़े वाले बदलाव')).toBeInTheDocument();
    expect(screen.getByText('आज कुछ बदलना नहीं है, इसलिए जोड़ने को कुछ नहीं।')).toBeInTheDocument();
  });
});
