// Tests for placing chosen candidates into slots.
import { describe, expect, it } from 'vitest';
import { assemblePlan, leadsTheDay } from '../../../src/features/planner/assemble.js';
import { situationOf } from '../../../src/features/planner/context.js';
import type { CandidateAction } from '../../../src/features/planner/types.js';
import { planContext } from '../../support/plan-fixtures.js';
import { sampleHousehold } from '../../support/samples.js';

function candidate(overrides: Partial<CandidateAction>): CandidateAction {
  return {
    id: 'x',
    kind: 'swap_mode',
    slot: 'morning',
    activityId: 'a1',
    memberIds: ['m1'],
    start: '08:00',
    effects: [],
    factIds: [],
    template: { title: 'T', why: 'W', tradeOff: null },
    whatIfs: [],
    ...overrides,
  };
}

const empty = { actions: [], indoor: [], alternatives: [] };

describe('assemblePlan', () => {
  it('leads each slot with protection for vulnerable members on a severe day, then goes by time', () => {
    const ctx = planContext(sampleHousehold(), 'severe');
    const picks = [
      candidate({ id: 'late', start: '09:00' }),
      candidate({ id: 'none', start: null }),
      candidate({ id: 'guard', kind: 'protect', memberIds: ['m3'], start: '10:00' }),
      candidate({ id: 'early', start: '07:00' }),
    ].map((found) => ({ candidate: found, text: found.template }));
    const plan = assemblePlan(ctx, empty, { picks, headline: 'H', language: 'en' });
    expect(plan.slots.morning.map((item) => item.candidateId)).toEqual(['guard', 'early', 'late', 'none']);
    expect(plan.slots.morning[0]).not.toHaveProperty('template');
  });

  it('keeps at most twelve items in a slot', () => {
    const picks = Array.from({ length: 14 }, (_, index) => candidate({ id: `c${String(index)}` })).map(
      (found) => ({
        candidate: found,
        text: found.template,
      }),
    );
    const plan = assemblePlan(planContext(sampleHousehold(), 'poor'), empty, {
      picks,
      headline: 'H',
      language: 'hi',
    });
    expect(plan.slots.morning).toHaveLength(12);
    expect(plan.language).toBe('hi');
  });
});

describe('leadsTheDay', () => {
  it('is true only for protection of a vulnerable member on a severe day', () => {
    const severe = situationOf(planContext(sampleHousehold(), 'severe'));
    const poor = situationOf(planContext(sampleHousehold(), 'poor'));
    expect(leadsTheDay(severe, candidate({ kind: 'move_indoors', memberIds: ['m3'] }))).toBe(true);
    expect(leadsTheDay(severe, candidate({ kind: 'protect', memberIds: ['m1'] }))).toBe(false);
    expect(leadsTheDay(poor, candidate({ kind: 'protect', memberIds: ['m3'] }))).toBe(false);
  });
});
