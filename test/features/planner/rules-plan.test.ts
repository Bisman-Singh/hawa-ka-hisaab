// Tests for the rules path.
import { describe, expect, it } from 'vitest';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import type { PlanContext } from '../../../src/features/planner/context.js';
import { rulesChoice, rulesPlan } from '../../../src/features/planner/rules-plan.js';
import { planSchema } from '../../../src/features/planner/schemas.js';
import type { CandidateAction } from '../../../src/features/planner/types.js';
import { notInHindi, planContext } from '../../support/plan-fixtures.js';
import { sampleCandidate, sampleHousehold } from '../../support/samples.js';

describe('rulesChoice', () => {
  it('keeps the first action and the first swap for each activity, and every action not tied to one', () => {
    const actions: CandidateAction[] = [
      { ...sampleCandidate(), id: 'move-a1', kind: 'reschedule' },
      { ...sampleCandidate(), id: 'protect-a1', kind: 'protect' },
      { ...sampleCandidate(), id: 'swap-a1', kind: 'swap_mode' },
      { ...sampleCandidate(), id: 'home-1', activityId: null },
      { ...sampleCandidate(), id: 'home-2', activityId: null },
    ];
    expect(rulesChoice(actions).map((action) => action.id)).toEqual([
      'move-a1',
      'swap-a1',
      'home-1',
      'home-2',
    ]);
  });
});

describe('rulesPlan', () => {
  it('is a valid English plan with the template words', () => {
    const ctx = planContext(sampleHousehold(), 'poor');
    const plan = rulesPlan(ctx, buildCandidates(ctx));
    expect(planSchema.safeParse(plan).success).toBe(true);
    expect(plan.language).toBe('en');
    expect(plan.headline).toBe(
      'The air is poor today. Most of the day can go ahead; the changes below matter most for the people most at risk.',
    );
  });

  it('is a Hindi plan in Hindi words when the context asks for Hindi, with the same numbers', () => {
    const en = planContext(sampleHousehold(), 'poor');
    const hi: PlanContext = { ...en, language: 'hi' };
    const plan = rulesPlan(hi, buildCandidates(hi));
    const english = rulesPlan(en, buildCandidates(en));
    expect(planSchema.safeParse(plan).success).toBe(true);
    expect(plan.language).toBe('hi');
    expect(notInHindi(plan)).toEqual([]);
    const effects = (p: typeof plan) =>
      [...p.slots.morning, ...p.slots.afternoon, ...p.slots.evening].map((i) => i.effects);
    expect(effects(plan)).toEqual(effects(english));
  });
});
