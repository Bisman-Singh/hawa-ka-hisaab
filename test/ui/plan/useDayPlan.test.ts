// Tests for the plan state: what to show for what is saved, the model choice, and where the plan request or, with
// the model off, the air request stands.
import { describe, expect, it, vi } from 'vitest';
import { dayPlanOf } from '../../../src/ui/plan/useDayPlan.js';
import { sample } from '../../support/plan-fixtures.js';
import { airResponse, DELHI, planResponse } from './fixtures.js';

type Saved = Parameters<typeof dayPlanOf>[0];
type Asks = Parameters<typeof dayPlanOf>[2];

const asks: Asks = { retry: vi.fn(), again: vi.fn(), air: { state: { status: 'idle' }, retry: vi.fn() } };
const household = sample('family-car-asthma');
const none: Saved = { household: null, location: null, plan: null, reading: null, choice: 'on' };

describe('dayPlanOf', () => {
  it('asks for a place first, then a household, then shows the plan, a failure or the wait', () => {
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
      local: false,
    });
    expect(dayPlanOf(saved, { status: 'failed', failure: { kind: 'network' } }, asks)).toMatchObject({
      status: 'failed',
      failure: { kind: 'network' },
    });
    expect(dayPlanOf(saved, { status: 'loading' }, asks)).toEqual({ status: 'loading', air: null });
  });

  it('asks for the model choice before any plan, once a place and household are saved', () => {
    const saved = { ...none, location: DELHI, household, choice: null };
    expect(dayPlanOf(saved, { status: 'idle' }, asks)).toEqual({ status: 'choose' });
  });

  it('with the model off waits on the air, not on a plan request, and marks the plan as made here', () => {
    const saved: Saved = { ...none, location: DELHI, household, choice: 'off' };
    const airRetry = vi.fn();
    const failing: Asks = {
      ...asks,
      air: { state: { status: 'failed', failure: { kind: 'network' } }, retry: airRetry },
    };
    expect(dayPlanOf(saved, { status: 'idle' }, failing)).toMatchObject({
      status: 'failed',
      retry: airRetry,
    });
    expect(dayPlanOf(saved, { status: 'idle' }, asks)).toEqual({ status: 'loading', air: null });
    const plan = planResponse('family-car-asthma', 'poor');
    expect(dayPlanOf({ ...saved, plan }, { status: 'idle' }, asks)).toMatchObject({
      status: 'ready',
      local: true,
    });
  });
});
