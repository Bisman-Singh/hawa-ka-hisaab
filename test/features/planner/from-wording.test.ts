// Tests for building the plan from the model's wording: ids checked, numbers from the candidates, protection kept.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { planFromWording } from '../../../src/features/planner/from-wording.js';
import { planSchema } from '../../../src/features/planner/schemas.js';
import { planContext, sample } from '../../support/plan-fixtures.js';

const family = sample('family-car-asthma');

describe('planFromWording', () => {
  it('refuses ids that were never sent and says which', () => {
    const ctx = planContext(family, 'poor');
    const wording = {
      headline: 'H',
      items: [{ candidateId: 'move-a9', title: 'T', why: 'W', tradeOff: null }],
    };
    expect(planFromWording(ctx, buildCandidates(ctx), { wording, language: 'en' })).toEqual({
      ok: false,
      error: { kind: 'unknown_candidate', ids: ['move-a9'] },
    });
  });

  it('uses the model words and the candidate numbers, times and effects', () => {
    const ctx = planContext(family, 'poor');
    const set = buildCandidates(ctx);
    const wording = {
      headline: 'हवा खराब है',
      items: [{ candidateId: 'move-a2', title: 'फुटबॉल 14:00 बजे', why: 'साफ़ हवा', tradeOff: null }],
    };
    const result = planFromWording(ctx, set, { wording, language: 'hi' });
    const item = result.ok ? result.value.slots.afternoon[0] : undefined;
    const candidate = set.actions.find((action) => action.id === 'move-a2');
    expect(item).toMatchObject({
      title: 'फुटबॉल 14:00 बजे',
      start: candidate?.start,
      effects: candidate?.effects,
    });
    expect(result.ok && result.value.language).toBe('hi');
    expect(result.ok && planSchema.safeParse(result.value).success).toBe(true);
  });

  it('keeps the rules protection of vulnerable members on a severe day when the model leaves it out', () => {
    const ctx = planContext(family, 'very_poor');
    const wording = {
      headline: 'H',
      items: [{ candidateId: 'swap-a1', title: 'Bus', why: 'Less CO2.', tradeOff: null }],
    };
    const result = planFromWording(ctx, buildCandidates(ctx), { wording, language: 'en' });
    const ids = result.ok
      ? [...result.value.slots.morning, ...result.value.slots.evening].map((item) => item.candidateId)
      : [];
    expect(ids).toEqual(expect.arrayContaining(['indoors-a2', 'indoors-a3', 'swap-a1']));
  });
});
