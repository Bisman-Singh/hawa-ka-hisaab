// Tests for building the plan from the model's wording: ids checked, numbers from the candidates, protection kept.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { planFromWording } from '../../../src/features/planner/from-wording.js';
import { planSchema } from '../../../src/features/planner/schemas.js';
import type { Member } from '../../../src/features/household/types.js';
import { planContext, sample, testActivity, testHousehold } from '../../support/plan-fixtures.js';

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

  it('keeps the rules choice for activities the model was not asked about, and writes CO2 with its subscript', () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      testActivity({ id: `a${String(index + 1)}`, label: `game ${String(index + 1)}` }),
    );
    const ctx = planContext(testHousehold(many), 'very_poor');
    const set = buildCandidates(ctx);
    const wording = {
      headline: 'Less CO2 today.',
      items: [{ candidateId: 'move-a1', title: 'T', why: 'Less CO2.', tradeOff: 'More CO2.' }],
    };
    const result = planFromWording(ctx, set, { wording, language: 'en' });
    const plan = result.ok ? result.value : null;
    const items = plan ? [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening] : [];
    expect(new Set(items.map((item) => item.activityId))).toEqual(
      new Set([...many.slice(12).map((a) => a.id), 'a1']),
    );
    expect(plan?.headline).toBe('Less CO₂ today.');
    expect(items.find((item) => item.candidateId === 'move-a1')).toMatchObject({
      why: 'Less CO₂.',
      tradeOff: 'More CO₂.',
    });
  });

  it('does not add a rules pick twice when it is also a protection the day requires', () => {
    const child = { id: 'm2', ageGroup: 'child', flags: [] } satisfies Member;
    const many = Array.from({ length: 13 }, (_, index) =>
      testActivity({ id: `a${String(index + 1)}`, memberIds: [index === 12 ? 'm2' : 'm1'], timing: 'fixed' }),
    );
    const household = testHousehold(many, [{ id: 'm1', ageGroup: 'adult', flags: [] }, child]);
    const ctx = planContext(household, 'severe');
    const set = buildCandidates(ctx);
    const result = planFromWording(ctx, set, { wording: { headline: 'H', items: [] }, language: 'en' });
    const plan = result.ok ? result.value : null;
    const ids = plan
      ? [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening].map((i) => i.candidateId)
      : [];
    expect(ids.length).toBe(new Set(ids).size);
  });
});
