// Tests for the plan contract: slots, items, indoor steps, alternatives and toggles.
import { describe, expect, it } from 'vitest';
import {
  alternativeSchema,
  candidateActionSchema,
  indoorStepSchema,
} from '../../../src/features/planner/schemas.js';
import { planSchema, whatIfSchema } from '../../../src/features/planner/schemas.js';
import { sampleCo2Effect, samplePlan, samplePlanItem } from '../../support/samples.js';

describe('planSchema', () => {
  it('accepts the sample plan with three slots', () => {
    expect(planSchema.safeParse(samplePlan()).success).toBe(true);
    const twoSlots = { morning: [], afternoon: [] };
    expect(planSchema.safeParse({ ...samplePlan(), slots: twoSlots }).success).toBe(false);
  });

  it('accepts a mild day with a reassuring item', () => {
    const reassure = { ...samplePlanItem(), kind: 'reassure', effects: [], activityId: null, start: null };
    const mild = {
      ...samplePlan(),
      dayKind: 'mild',
      band: 'satisfactory',
      slots: { morning: [reassure], afternoon: [], evening: [] },
    };
    expect(planSchema.safeParse(mild).success).toBe(true);
  });

  it('refuses a mild day that carries a restriction', () => {
    const mild = { ...samplePlan(), dayKind: 'mild', band: 'good' };
    const result = planSchema.safeParse(mild);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'a mild day carries no restrictions',
    );
  });

  it('keeps the day kind in step with the band, unknown when the band is unknown', () => {
    expect(planSchema.safeParse({ ...samplePlan(), dayKind: 'severe' }).success).toBe(false);
    const noItems = { morning: [], afternoon: [], evening: [] };
    expect(
      planSchema.safeParse({ ...samplePlan(), dayKind: 'unknown', band: null, slots: noItems }).success,
    ).toBe(true);
    expect(planSchema.safeParse({ ...samplePlan(), dayKind: 'moderate', band: null }).success).toBe(false);
  });
});

describe('candidateActionSchema', () => {
  it('carries English template text the rules path uses as is', () => {
    const item = samplePlanItem();
    const candidate = {
      id: item.candidateId,
      kind: item.kind,
      slot: item.slot,
      activityId: item.activityId,
      memberIds: item.memberIds,
      start: item.start,
      effects: item.effects,
      factIds: item.factIds,
      template: {
        title: item.title,
        why: item.why,
        tradeOff: 'Cycling cuts CO2 but raises inhaled dose today.',
      },
      whatIfs: [],
    };
    expect(candidateActionSchema.safeParse(candidate).success).toBe(true);
  });
});

describe('whatIfSchema', () => {
  it('exists only with a cited factor', () => {
    const toggle = {
      id: 'metro-a1',
      label: 'Take the metro',
      patch: { op: 'set_travel_mode', activityId: 'a1', mode: 'metro', fuel: null },
    };
    expect(whatIfSchema.safeParse({ ...toggle, factIds: ['test-factor'] }).success).toBe(true);
    expect(whatIfSchema.safeParse({ ...toggle, factIds: [] }).success).toBe(false);
  });
});

describe('indoorStepSchema and alternativeSchema', () => {
  it('needs a source on every indoor step', () => {
    const step = {
      id: 'wet-mop',
      topic: 'wet_mopping',
      title: 'Wet mop',
      detail: 'Dust settles.',
      roomId: null,
      window: null,
      figure: null,
      factIds: ['test-factor'],
    };
    expect(indoorStepSchema.safeParse(step).success).toBe(true);
    expect(indoorStepSchema.safeParse({ ...step, factIds: [] }).success).toBe(false);
  });

  it('allows an alternative with a reason only when no factor is cited', () => {
    const alternative = {
      id: 'combine-trips',
      activityId: null,
      instead: 'two trips',
      doThis: 'one combined trip',
      reason: 'Fewer cold starts.',
      effect: null,
      factIds: [],
    };
    expect(alternativeSchema.safeParse(alternative).success).toBe(true);
    expect(
      alternativeSchema.safeParse({ ...alternative, effect: sampleCo2Effect(), factIds: ['test-factor'] })
        .success,
    ).toBe(true);
  });
});
