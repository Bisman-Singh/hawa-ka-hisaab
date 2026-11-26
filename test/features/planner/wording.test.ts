// Tests for the model's reply when it words a plan.
import { describe, expect, it } from 'vitest';
import { planWordingSchema } from '../../../src/features/planner/wording.js';

const item = {
  candidateId: 'reschedule-a2',
  title: 'Move football earlier',
  why: 'Cleaner at four.',
  tradeOff: null,
};

describe('planWordingSchema', () => {
  it('accepts a headline and worded candidates', () => {
    expect(planWordingSchema.safeParse({ headline: 'A careful evening.', items: [item] }).success).toBe(true);
  });

  it('refuses a candidate chosen twice', () => {
    const result = planWordingSchema.safeParse({ headline: 'x', items: [item, item] });
    expect(result.error?.issues[0]?.message).toBe('each candidate may be chosen once');
  });

  it('gives the model no field to set a number, time or effect', () => {
    for (const extra of [{ start: '16:00' }, { effects: [] }, { slot: 'morning' }]) {
      expect(planWordingSchema.safeParse({ headline: 'x', items: [{ ...item, ...extra }] }).success).toBe(
        false,
      );
    }
  });
});
