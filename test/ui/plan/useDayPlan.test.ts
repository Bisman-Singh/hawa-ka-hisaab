// Tests for the plan state: what to show for what is saved and where the request stands.
import { describe, expect, it, vi } from 'vitest';
import { dayPlanOf } from '../../../src/ui/plan/useDayPlan.js';
import { sample } from '../../support/plan-fixtures.js';
import { airResponse, DELHI, planResponse } from './fixtures.js';

const asks = { retry: vi.fn(), again: vi.fn() };
const household = sample('family-car-asthma');

describe('dayPlanOf', () => {
  it('asks for a place first, then a household, then shows the plan, a failure or the wait', () => {
    const none = { household: null, location: null, plan: null, reading: null };
    expect(dayPlanOf(none, { status: 'idle' }, asks)).toEqual({ status: 'no_place' });
    expect(dayPlanOf({ ...none, location: DELHI }, { status: 'idle' }, asks)).toEqual({
      status: 'no_household',
    });
    const saved = { ...none, location: DELHI, household };
    const plan = planResponse('family-car-asthma', 'poor');
    expect(dayPlanOf({ ...saved, plan, reading: airResponse() }, { status: 'loading' }, asks)).toMatchObject({
      status: 'ready',
      response: plan,
      location: DELHI,
    });
    expect(dayPlanOf(saved, { status: 'failed', failure: { kind: 'network' } }, asks)).toMatchObject({
      status: 'failed',
      failure: { kind: 'network' },
    });
    expect(dayPlanOf(saved, { status: 'loading' }, asks)).toEqual({ status: 'loading', air: null });
  });
});
