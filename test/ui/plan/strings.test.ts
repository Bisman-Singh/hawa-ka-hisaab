// Tests for the plan strings: each slot is named, and the modelled label says it is not a measurement.
import { describe, expect, it } from 'vitest';
import { PLAN, STRIP } from '../../../src/ui/plan/strings.js';

describe('plan strings', () => {
  it('names the three slots and labels the modelled path and the forecast as models', () => {
    expect(Object.values(PLAN.slots)).toEqual(['Morning', 'Afternoon', 'Evening']);
    expect(PLAN.modelled).toContain('Not a measurement.');
    expect(STRIP.about).toContain('A model forecast');
  });
});
