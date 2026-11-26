// Tests for the fact set sent to the model and kept in the trace.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { buildFactSet, factSetTimes } from '../../../src/features/planner/fact-set.js';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import { factValueSchema } from '../../../src/lib/schemas/facts.js';
import type { AqiBand } from '../../../src/features/naqi/types.js';
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

const BANDS: readonly AqiBand[] = ['severe', 'moderate', 'satisfactory'];

describe('factSetTimes', () => {
  it('gives every time the set holds, each with its hour and minute among the set values, for every sample', () => {
    for (const { household } of SAMPLE_HOUSEHOLDS) {
      for (const band of BANDS) {
        const ctx = planContext(household, band);
        const set = buildCandidates(ctx);
        const values = new Set(buildFactSet(ctx, set).map((fact) => fact.value));
        const times = factSetTimes(ctx, set);
        const missing = times.filter(
          (time) => !values.has(Number(time.slice(0, 2))) || !values.has(Number(time.slice(3))),
        );
        expect({ band, missing }).toEqual({ band, missing: [] });
      }
    }
  });

  it('holds the start and end of a moved activity, its toggle times and the indoor windows', () => {
    const ctx = planContext(sampleHousehold(), 'severe');
    const set = buildCandidates(ctx);
    const times = factSetTimes(ctx, set);
    const windows = set.indoor.flatMap((step) => (step.window ? [step.window.start, step.window.end] : []));
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((time) => times.includes(time))).toBe(true);
    const starts = set.actions.flatMap((action) => (action.start === null ? [] : [action.start]));
    expect(starts.every((time) => times.includes(time))).toBe(true);
    expect(new Set(times).size).toBe(times.length);
  });

  it('gives no time for a candidate with no start and no activity', () => {
    const ctx = planContext(sampleHousehold(), 'severe');
    const loose = { ...sampleCandidate(), activityId: null, start: null, whatIfs: [] };
    expect(factSetTimes(ctx, { actions: [loose], indoor: [], alternatives: [] })).toEqual([]);
  });
});
