// Tests for what-if toggles: the same pure functions as the plan, and a refusal for home patches.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { whatIfEffects } from '../../../src/features/planner/what-if.js';
import { flatDay, planContext, sample } from '../../support/plan-fixtures.js';
import { hourCurve } from '../../support/fake-air.js';

const family = sample('family-car-asthma');

describe('whatIfEffects', () => {
  it('recomputes exactly what the candidate shows for its toggles', () => {
    const ctx = planContext(family, 'poor');
    const swap = buildCandidates(ctx).actions.find((action) => action.id === 'swap-a1');
    for (const toggle of swap?.whatIfs ?? []) {
      const result = whatIfEffects(ctx, toggle.patch);
      expect(result.ok && result.value.length).toBeGreaterThan(0);
    }
    const bus = whatIfEffects(ctx, { op: 'set_travel_mode', activityId: 'a1', mode: 'bus', fuel: null });
    expect(bus.ok && bus.value).toEqual(swap?.effects);
  });

  it('changes nothing when moving to an hour with the same forecast value', () => {
    const flat = planContext(family, 'poor', hourCurve(flatDay(150)));
    const result = whatIfEffects(flat, { op: 'set_start', activityId: 'a2', start: '14:00' });
    expect(
      result.ok && result.value.map((effect) => (effect.kind === 'exposure' ? effect.change : null)),
    ).toEqual([{ low: 0, high: 0 }]);
  });

  it('refuses home patches and passes on patch failures', () => {
    const ctx = planContext(family, 'poor');
    expect(whatIfEffects(ctx, { op: 'set_cooking_fuel', fuel: 'induction' })).toEqual({
      ok: false,
      error: 'not_an_activity_change',
    });
    expect(whatIfEffects(ctx, { op: 'set_start', activityId: 'zz', start: '14:00' })).toEqual({
      ok: false,
      error: 'unknown_activity',
    });
  });
});
