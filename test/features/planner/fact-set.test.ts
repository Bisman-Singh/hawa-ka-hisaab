// Tests for the fact set sent to the model and kept in the trace.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { buildFactSet } from '../../../src/features/planner/fact-set.js';
import { factValueSchema } from '../../../src/lib/schemas/facts.js';
import { traceSchema } from '../../../src/lib/schemas/trace.js';
import { planContext } from '../../support/plan-fixtures.js';
import { sampleCandidate, sampleHousehold, sampleTrace } from '../../support/samples.js';

describe('buildFactSet', () => {
  it('lists each number once with a valid id and label, and fits the trace', () => {
    const ctx = planContext(sampleHousehold(), 'very_poor');
    const facts = buildFactSet(ctx, buildCandidates(ctx));
    expect(facts.every((fact) => factValueSchema.safeParse(fact).success)).toBe(true);
    const keys = facts.map((fact) => `${fact.id}|${String(fact.value)}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(traceSchema.safeParse({ ...sampleTrace(), factsSent: facts }).success).toBe(true);
  });

  it('includes the cited factor, the shown figure and the household numbers behind a swap', () => {
    const ctx = planContext(sampleHousehold(), 'poor');
    const facts = buildFactSet(ctx, buildCandidates(ctx));
    const values = (id: string) => facts.filter((fact) => fact.id === id).map((fact) => fact.value);
    expect(values('co2-car-petrol')).toEqual([0.13]);
    expect(values('swap-a1')).toEqual(expect.arrayContaining([8, 30, 14, 45, 3.2]));
  });

  it('copes with a candidate that has no activity, no start or no travel distance', () => {
    const ctx = planContext(sampleHousehold(), 'poor');
    const lone = { ...sampleCandidate(), id: 'home-1', activityId: null, start: null };
    const away = { ...sampleCandidate(), id: 'away-a1', activityId: 'a9' };
    const set = { actions: [lone, away], indoor: [], alternatives: [] };
    expect(buildFactSet(ctx, set).map((fact) => [fact.id, fact.value])).toEqual([
      ['away-a1', 8],
      ['away-a1', 30],
    ]);
    const noDistance = {
      ...sampleHousehold(),
      activities: sampleHousehold().activities.map((activity) => ({
        ...activity,
        travel: activity.travel && { ...activity.travel, distanceKm: null, occupancy: null },
      })),
    };
    const facts = buildFactSet(
      { ...ctx, household: noDistance },
      { ...set, actions: [{ ...sampleCandidate(), start: null }] },
    );
    expect(facts.find((fact) => fact.label === 'End time')?.value).toBe(9);
    expect(facts.map((fact) => fact.label)).not.toContain('Distance one way');
  });
});
