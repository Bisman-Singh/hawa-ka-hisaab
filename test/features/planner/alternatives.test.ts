// Tests for the "instead of X, do Y" pairs.
import { describe, expect, it } from 'vitest';
import type { Activity } from '../../../src/features/household/types.js';
import { alternativesFor } from '../../../src/features/planner/alternatives.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

const driven = (id: string, kind: Activity['kind']): Activity =>
  testActivity({
    id,
    kind,
    label: null,
    setting: 'in_transit',
    travel: { mode: 'car', fuel: 'petrol', distanceKm: 3, occupancy: 1, roundTrip: true },
  });

describe('alternativesFor', () => {
  it('pairs each car trip with the bus, the metro and a shared ride, numbers only where a factor is cited', () => {
    const pairs = alternativesFor(situationOf(planContext(testHousehold([driven('a1', 'commute')]), 'poor')));
    expect(pairs.map((pair) => pair.id)).toEqual(['alt-bus-a1', 'alt-metro-a1', 'alt-carpool-a1']);
    expect(pairs.map((pair) => pair.effect?.kind ?? null)).toEqual(['co2', null, 'co2']);
    expect(pairs[0]?.instead).toBe('the commute by car');
  });

  it('adds the school bus for a school run and one combined trip for driven errands', () => {
    const household = testHousehold([
      driven('a1', 'school_run'),
      driven('a2', 'errand'),
      driven('a3', 'errand'),
    ]);
    const ids = alternativesFor(situationOf(planContext(household, 'good'))).map((pair) => pair.id);
    expect(ids).toContain('alt-school-bus-a1');
    expect(ids).toContain('alt-combine-errands');
    expect(ids.length).toBeLessThanOrEqual(12);
  });

  it('gives no travel pair for walking, cycling or a single errand', () => {
    const walk = testActivity({
      kind: 'errand',
      travel: { mode: 'walk', fuel: null, distanceKm: 1, occupancy: 1, roundTrip: true },
    });
    expect(
      alternativesFor(situationOf(planContext(testHousehold([walk, driven('a2', 'errand')]), 'good'))).map(
        (p) => p.id,
      ),
    ).not.toContain('alt-combine-errands');
    expect(alternativesFor(situationOf(planContext(testHousehold([walk]), 'good')))).toEqual([]);
  });

  it('keeps at most twelve pairs', () => {
    const many = Array.from({ length: 6 }, (_, index) => driven(`a${String(index)}`, 'commute'));
    expect(alternativesFor(situationOf(planContext(testHousehold(many), 'good')))).toHaveLength(12);
  });
});
