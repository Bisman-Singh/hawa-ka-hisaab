// Tests for turning a drafted action into a candidate.
import { describe, expect, it } from 'vitest';
import { candidateFor, unique } from '../../../src/features/planner/draft.js';
import { candidateActionSchema } from '../../../src/features/planner/schemas.js';
import { testActivity } from '../../support/plan-fixtures.js';

describe('candidateFor', () => {
  it('forms the id from the prefix and activity, and places it by its start', () => {
    const template = { title: 'Move football', why: 'Cleaner hours.', tradeOff: null };
    const ids = Array.from({ length: 14 }, (_, index) => `fact-${String(index)}`);
    const candidate = candidateFor(testActivity(), {
      kind: 'reschedule',
      prefix: 'move',
      start: 840,
      effects: [],
      factIds: [...ids, 'fact-1'],
      template,
      whatIfs: [],
    });
    expect(candidate).toMatchObject({ id: 'move-a1', slot: 'afternoon', start: '14:00', activityId: 'a1' });
    expect(candidate.factIds).toHaveLength(12);
    expect(candidateActionSchema.safeParse(candidate).success).toBe(true);
    expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });
});
