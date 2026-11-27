// Tests for protection of activities that stay where they are.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { situationOf, type PlanContext } from '../../../src/features/planner/context.js';
import { protect } from '../../../src/features/planner/protect.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

const adult: Member = { id: 'm1', ageGroup: 'adult', flags: [] };
const child: Member = { id: 'm2', ageGroup: 'child', flags: [] };
const drive = testActivity({
  kind: 'commute',
  label: 'school run',
  memberIds: ['m1', 'm2'],
  setting: 'in_transit',
  timing: 'fixed',
  travel: { mode: 'car', fuel: 'petrol', distanceKm: 4, occupancy: 2, roundTrip: true },
});

describe('protect', () => {
  it('keeps a car closed with the AC on instead of a mask, with the car and child notes, on a poor day', () => {
    const s = situationOf(planContext(testHousehold([drive], [adult, child]), 'poor'));
    const action = protect(s, drive, 'poor');
    expect(action?.template.title).toBe('School run: windows up, AC on');
    expect(action?.effects.map((effect) => effect.working.factIds[0])).toEqual(['advice-ac-recirculate']);
    expect(action?.template.why).toContain('AC on recirculate');
    expect(action?.template.why).toContain('No study measured how well masks protect children');
    expect(action?.template.why).not.toContain('Health ministry advice');
    expect(action?.factIds).toEqual(expect.arrayContaining(['advice-ac-recirculate', 'mask-children-quote']));
    const run = testActivity({ timing: 'fixed' });
    const both = protect(situationOf(planContext(testHousehold([run]), 'poor')), run, 'poor');
    expect(both?.template.title).toBe('Football: go at a light pace and wear a well fitted N95');
  });

  it('closes the car on a moderate day too, where there is no mask', () => {
    const s = situationOf(planContext(testHousehold([drive], [adult, child]), 'moderate'));
    expect(protect(s, drive, 'moderate')?.template.title).toBe('School run: windows up, AC on');
  });

  it('gives an outdoor worker a step on a moderate day: the advice for the vulnerable and breaks off the road', () => {
    const rider: Member = { id: 'm1', ageGroup: 'adult', flags: ['outdoor_worker'] };
    const shift = testActivity({
      kind: 'outdoor_work',
      label: 'delivery shift',
      timing: 'fixed',
      durationMinutes: 600,
      travel: { mode: 'two_wheeler', fuel: 'petrol', distanceKm: 60, occupancy: 1, roundTrip: false },
    });
    const s = situationOf(planContext(testHousehold([shift], [rider]), 'moderate'));
    const action = protect(s, shift, 'moderate');
    expect(action?.template.title).toBe('Delivery shift: take breaks away from traffic');
    expect(action?.template.why).toContain('"Avoid prolonged or strenuous outdoor physical exertion"');
    expect(action?.factIds).toEqual(
      expect.arrayContaining(['advice-vulnerable-groups', 'exposure-onroad-quote']),
    );
    const poor = protect(situationOf(planContext(testHousehold([shift], [rider]), 'poor')), shift, 'poor');
    expect(poor?.template.title).toBe(
      'Delivery shift: wear a well fitted N95 and take breaks away from traffic',
    );
    expect(poor?.template.why).toContain('on a long shift replace it as instructed');
    const walker = { ...shift, travel: null };
    const ease = protect(
      situationOf(planContext(testHousehold([walker], [rider]), 'moderate')),
      walker,
      'moderate',
    );
    expect(ease?.template.title).toBe('Delivery shift: ease off where you can');
  });

  it('writes in Hindi when the plan is in Hindi', () => {
    const ctx: PlanContext = {
      ...planContext(testHousehold([drive], [adult, child]), 'poor'),
      language: 'hi',
    };
    expect(protect(situationOf(ctx), drive, 'poor')?.template.title).toBe('आना-जाना: खिड़कियाँ बंद, AC चालू');
  });

  it('keeps it short for vulnerable members on a severe day even with nothing to measure', () => {
    const errand = testActivity({ kind: 'errand', label: 'market', memberIds: ['m2'] });
    const s = situationOf(planContext(testHousehold([errand], [adult, child]), 'very_poor'));
    expect(protect(s, errand, 'very_poor')).toMatchObject({
      effects: [],
      template: { title: 'Market: keep it short' },
    });
  });

  it('adds nothing for an adult errand on a moderate day', () => {
    const errand = testActivity({ kind: 'errand', label: 'market' });
    expect(
      protect(situationOf(planContext(testHousehold([errand]), 'moderate')), errand, 'moderate'),
    ).toBeNull();
  });
});
