// Tests for building the candidate set.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { candidateActionSchema } from '../../../src/features/planner/schemas.js';
import { planContext, sample } from '../../support/plan-fixtures.js';
import { sampleHousehold } from '../../support/samples.js';

describe('buildCandidates', () => {
  it('gives valid candidates with unique ids, indoor steps and alternatives', () => {
    const set = buildCandidates(planContext(sampleHousehold(), 'poor'));
    expect(set.actions.every((action) => candidateActionSchema.safeParse(action).success)).toBe(true);
    expect(new Set(set.actions.map((action) => action.id)).size).toBe(set.actions.length);
    expect(set.indoor.length).toBeGreaterThan(0);
    expect(set.alternatives.length).toBeGreaterThan(0);
  });

  it('plans a later activity around an earlier one that moved, so the same people are not booked twice', () => {
    const set = buildCandidates(planContext(sample('older-couple-chulha'), 'severe'));
    const moves = set.actions.filter((action) => action.kind === 'reschedule').map((action) => action.start);
    expect(moves).toEqual(['14:00', '15:00']);
  });
});
