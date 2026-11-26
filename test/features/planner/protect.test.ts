// Tests for protection of activities that stay where they are.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
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
  it('adds a light pace and an N95 on a poor day, with car and child notes', () => {
    const s = situationOf(planContext(testHousehold([drive], [adult, child]), 'poor'));
    const action = protect(s, drive, 'poor');
    expect(action?.template.title).toBe('School run: wear a well fitted N95');
    expect(action?.template.why).toContain('AC on recirculate');
    expect(action?.template.why).toContain('No study measured how well masks protect children');
    expect(action?.factIds).toEqual(expect.arrayContaining(['advice-ac-recirculate', 'mask-children-quote']));
    const run = testActivity({ timing: 'fixed' });
    const both = protect(situationOf(planContext(testHousehold([run]), 'poor')), run, 'poor');
    expect(both?.template.title).toBe('Football: go at a light pace and wear a well fitted N95');
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
