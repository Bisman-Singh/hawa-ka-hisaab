// Tests for the plan helpers: entries by slot with moved activities and severe-day protection first, sums worded by
// the ledger, what-if effects from the planner, and words for who and when.
import { describe, expect, it } from 'vitest';
import { formatEffect } from '../../../src/features/ledger/format.js';
import type { PlanItem, WhatIf } from '../../../src/features/planner/types.js';
import {
  activityOf,
  contextFor,
  whatIfOf,
  entriesBySlot,
  fixityOf,
  itemsOf,
  rowsOf,
  sumsOf,
  sumsSentence,
  usableToggles,
  whatIfEffectsOf,
  whoLine,
} from '../../../src/ui/plan/plan-data.js';
import { sample } from '../../support/plan-fixtures.js';
import { FORECAST, need, planResponse } from './fixtures.js';

const household = sample('family-car-asthma');

describe('entriesBySlot', () => {
  it('shows a moved activity at its usual time and the move at the new one', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const slots = entriesBySlot(plan, household);
    const moved = slots.morning.find((entry) => entry.kind === 'moved');
    expect(moved?.at).toBe('07:00');
    expect(slots.afternoon.map((entry) => entry.kind)).toEqual(['item', 'item']);
    expect(slots.evening.map((entry) => entry.kind)).toEqual(['moved']);
  });

  it('puts protection for vulnerable members first on a severe day, as the planner orders it', () => {
    const { plan } = planResponse('family-car-asthma', 'very_poor');
    const first = need(entriesBySlot(plan, household).morning[0]);
    expect(first.kind === 'item' ? first.item.kind : '').toBe('move_indoors');
  });

  it('places an item without a start at the top of its slot', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const item: PlanItem = { ...need(plan.slots.morning[0]), start: null, activityId: null };
    const slots = entriesBySlot(
      { ...plan, slots: { ...plan.slots, morning: [...plan.slots.morning, item] } },
      household,
    );
    expect(need(slots.morning[0]).at).toBe('00:00');
  });
});

describe('sums and what-if', () => {
  it('words effects with the ledger and says why when there is none', () => {
    const effect = need(itemsOf(planResponse('family-car-asthma', 'poor').plan)[1]?.effects[0]);
    expect(effect.kind).toBe('co2');
    expect(sumsOf([effect], false)[0]?.text).toBe(formatEffect(effect));
    expect(sumsOf([], true)).toEqual([{ label: 'Effect', text: 'None needed.', none: true }]);
    expect(sumsOf([], false)[0]?.text).toBe('No figure. No measured factor for this step.');
    expect(rowsOf(sumsOf([], true))).toEqual([{ label: 'Effect', none: 'None needed.' }]);
    expect(rowsOf([{ label: 'CO2', text: '1 kg less', none: false }])).toEqual([
      { label: 'CO2', figure: '1 kg less' },
    ]);
    expect(
      sumsSentence([
        { label: 'A', text: 'b', none: false },
        { label: 'C', text: 'd', none: true },
      ]),
    ).toBe('A: b. C: d');
  });

  it('gives no effects for a toggle the planner refuses, and keeps start toggles only with a curve', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const ctx = contextFor(plan, household, { curve: FORECAST, notBefore: null });
    const refused: WhatIf = {
      id: 'x',
      label: 'X',
      patch: { op: 'set_cooking_fuel', fuel: 'lpg' },
      factIds: ['a'],
    };
    expect(whatIfEffectsOf(ctx, refused)).toEqual([]);
    const moved = need(plan.slots.afternoon[0]);
    expect(usableToggles(ctx, moved)).toHaveLength(2);
    expect(usableToggles(contextFor(plan, household, { curve: null, notBefore: null }), moved)).toEqual([]);
  });

  it('recomputes with the curve and planning time the server sent, and with neither for an older response', () => {
    const response = planResponse('family-car-asthma', 'poor', { notBefore: '09:30' });
    const whatIf = need(response.whatIfContext);
    expect(whatIfOf(response)).toBe(whatIf);
    expect(contextFor(response.plan, household, whatIf)).toEqual({
      household,
      band: response.plan.band,
      curve: whatIf.curve,
      date: response.plan.date,
      notBefore: '09:30',
    });
    const older = planResponse('family-car-asthma', 'poor', { withContext: false });
    expect(whatIfOf(older)).toEqual({ curve: null, notBefore: null });
  });
});

describe('words for an item', () => {
  it('names the people and minutes, the fixity and where a moved item came from', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const commute = need(plan.slots.morning[0]);
    expect(whoLine(household, commute)).toMatch(/^adult, \d+ minutes$/);
    expect(whoLine(household, { ...commute, activityId: null })).toBe('adult');
    expect(fixityOf(household, commute)).toBe('fixed');
    expect(fixityOf(household, need(plan.slots.afternoon[0]))).toMatch(/^from \d\d:\d\d$/);
    expect(fixityOf(household, { ...commute, activityId: null })).toBe('can move');
    expect(activityOf(household, null)).toBeNull();
  });
});
