// Tests for comparing two households' plans in the same air.
import { describe, expect, it } from 'vitest';
import type { Household } from '../../../src/features/household/types.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { comparePlans, type ComparedPlan } from '../../../src/features/planner/compare.js';
import { rulesPlan } from '../../../src/features/planner/rules-plan.js';
import type { AirBasis } from '../../../src/features/planner/types.js';
import { planContext, sample } from '../../support/plan-fixtures.js';
import { samplePlan, samplePlanItem } from '../../support/samples.js';

const basis: AirBasis = {
  path: 'station',
  band: 'very_poor',
  readingHour: '2026-11-24T22:00:00+05:30',
  forecastIssuedAt: null,
};

function side(household: Household): ComparedPlan {
  const ctx = planContext(household, 'very_poor');
  return { household, plan: rulesPlan(ctx, buildCandidates(ctx)), airBasis: basis };
}

describe('comparePlans', () => {
  it('names who is protected, what moved indoors and the travel changes for each household', () => {
    const result = comparePlans(side(sample('family-car-asthma')), side(sample('delivery-rider')));
    const lines = result.ok ? Object.fromEntries(result.value.map((line) => [line.topic, line])) : {};
    expect(lines['protected']).toEqual({
      topic: 'protected',
      left: 'adult; child with asthma or a lung condition; older adult with a heart condition',
      right: 'adult who works outdoors',
    });
    expect(lines['indoors']?.left).toBe('walk in the park; football practice');
    expect(lines['indoors']?.right).toBe('Nothing kept indoors');
    expect(lines['travel']?.right).toBe('No travel change');
  });

  it('lists nothing for the same plan and refuses plans made on different air', () => {
    const family = side(sample('family-car-asthma'));
    expect(comparePlans(family, family)).toEqual({ ok: true, value: [] });
    expect(comparePlans(family, { ...family, airBasis: { ...basis, band: 'poor' } })).toEqual({
      ok: false,
      error: 'different_air',
    });
  });

  it('falls back to the item title and copes with no cut and no start', () => {
    const household = sample('family-car-asthma');
    const moved = { ...samplePlanItem(), activityId: 'zz', start: null, effects: [] };
    const plan = { ...samplePlan(), slots: { morning: [], afternoon: [moved], evening: [] } };
    const result = comparePlans(
      { household, plan, airBasis: basis },
      { household, plan: samplePlan(), airBasis: basis },
    );
    const moves = result.ok ? result.value.find((line) => line.topic === 'moved') : undefined;
    expect(moves?.left).toBe('Move football practice earlier to ');
    const cut = result.ok ? result.value.find((line) => line.topic === 'largest_cut') : undefined;
    expect(cut).toEqual({
      topic: 'largest_cut',
      left: 'No cut in what is breathed in',
      right: '30 to 60% less breathed in, for football practice',
    });
  });
});
