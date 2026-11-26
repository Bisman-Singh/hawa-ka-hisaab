// Tests for the plan context and the situation derived from it.
import { describe, expect, it } from 'vitest';
import { bandAtLeast, situationOf, vulnerableAmong } from '../../../src/features/planner/context.js';
import { planContext } from '../../support/plan-fixtures.js';
import { sampleHousehold } from '../../support/samples.js';

describe('situationOf', () => {
  it('works out the day kind, the forecast by hour and the earliest start', () => {
    const s = situationOf({ ...planContext(sampleHousehold(), 'very_poor'), notBefore: '10:30' });
    expect(s.dayKind).toBe('severe');
    expect(s.day.get(14)).toBe(110);
    expect(s.notBefore).toBe(630);
    expect(situationOf(planContext(sampleHousehold(), null)).notBefore).toBe(0);
  });

  it('finds the vulnerable members among some ids', () => {
    const s = situationOf(planContext(sampleHousehold(), 'poor'));
    expect(vulnerableAmong(s, ['m1', 'm2', 'm3']).map((member) => member.id)).toEqual(['m2', 'm3']);
  });
});

describe('bandAtLeast', () => {
  it('compares bands in order and is false for an unknown band', () => {
    expect(bandAtLeast('poor', 'poor')).toBe(true);
    expect(bandAtLeast('severe', 'poor')).toBe(true);
    expect(bandAtLeast('moderate', 'poor')).toBe(false);
    expect(bandAtLeast(null, 'good')).toBe(false);
  });
});
