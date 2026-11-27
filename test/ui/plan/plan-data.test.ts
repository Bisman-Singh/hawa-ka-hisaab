// Tests for the plan helpers: entries by slot with moved activities and severe-day protection first, sums laid out
// by the ledger in the plan's language with a range across zero never headlined as a saving, and what-if effects.
import { describe, expect, it } from 'vitest';
import { effectDisplay } from '../../../src/features/ledger/display.js';
import type { PlanItem, WhatIf } from '../../../src/features/planner/types.js';
import {
  activityOf,
  contextFor,
  whatIfOf,
  entriesBySlot,
  itemsOf,
  notesOf,
  rowsOf,
  sumsOf,
  sumsSentence,
  usableToggles,
  whatIfEffectsOf,
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
  it('lays effects out with the ledger, figure then range, and says why when there is none', () => {
    const effect = need(itemsOf(planResponse('family-car-asthma', 'poor').plan)[1]?.effects[0]);
    expect(effect.kind).toBe('co2');
    const shown = effectDisplay(effect);
    const [sum] = sumsOf([effect], false);
    expect(sum).toEqual({
      label: 'Travel CO₂',
      text: shown.headline,
      detail: shown.detail,
      note: shown.note,
      sentence: shown.sentence,
      none: false,
    });
    expect(rowsOf(sumsOf([effect], false))).toEqual([
      { label: 'Travel CO₂', figure: shown.headline, range: shown.detail },
    ]);
    const none = { label: 'Effect', text: 'None needed.', detail: '', note: null, none: true };
    expect(sumsOf([], true)).toEqual([{ ...none, sentence: 'Effect: None needed.' }]);
    expect(sumsOf([], false)[0]?.text).toBe('No figure. No measured factor for this step.');
    expect(rowsOf(sumsOf([], true))).toEqual([{ label: 'Effect', none: 'None needed.' }]);
    expect(sumsSentence(sumsOf([effect], false))).toBe(shown.sentence);
  });

  it('headlines a range that could be a cut or a rise by its rise, with the reason it is wide, in either language', () => {
    const bus = need(
      itemsOf(planResponse('family-car-asthma', 'poor').plan).find((i) => i.candidateId === 'swap-a1'),
    );
    const sums = sumsOf(bus.effects, false);
    const mixed = need(sums.find((sum) => sum.label === 'Breathed in'));
    expect(mixed.text).toBe('Up to 2.4× as much');
    expect(mixed.text).not.toMatch(/less/);
    expect(mixed.detail).toMatch(/^or 8% less/);
    expect(notesOf([...sums, ...sums])).toEqual([need(mixed.note)]);
    const hindi = sumsOf(bus.effects, false, 'hi');
    expect(hindi.map((sum) => sum.label)).toEqual(['सफर का CO₂', 'साँस में प्रदूषण']);
    expect(hindi[1]?.text).toBe('2.4 गुना तक');
    expect(sumsOf([], false, 'hi')[0]?.label).toBe('असर');
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

describe('activityOf', () => {
  it('finds the activity an item is about, and none for an item about no activity', () => {
    expect(activityOf(household, 'a1')?.id).toBe('a1');
    expect(activityOf(household, null)).toBeNull();
  });
});
