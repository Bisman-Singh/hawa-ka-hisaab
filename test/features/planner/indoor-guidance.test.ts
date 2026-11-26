// Tests for masks, mopping, smoke sources and myth corrections.
import { describe, expect, it } from 'vitest';
import type { Household, Member } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { guidanceSteps } from '../../../src/features/planner/indoor-guidance.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

const child: Member = { id: 'm1', ageGroup: 'child', flags: [] };
const ids = (household: Household, band: Parameters<typeof planContext>[1]) =>
  guidanceSteps(situationOf(planContext(household, band))).map((step) => step.id);

describe('guidanceSteps', () => {
  it('adds mask advice on a poor day when someone goes out, with a children note', () => {
    expect(ids(testHousehold([testActivity()]), 'poor')).toContain('mask');
    expect(ids(testHousehold([testActivity({ setting: 'indoor' })]), 'poor')).not.toContain('mask');
    expect(ids(testHousehold([testActivity()]), 'moderate')).not.toContain('mask');
    const kids = guidanceSteps(situationOf(planContext(testHousehold([testActivity()], [child]), 'poor')));
    expect(kids.find((step) => step.id === 'mask')?.factIds).toContain('mask-children-quote');
  });

  it('adds wet mopping on moderate and severe days only', () => {
    expect(ids(testHousehold([]), 'moderate')).toContain('wet-mop');
    expect(ids(testHousehold([]), 'good')).not.toContain('wet-mop');
    expect(ids(testHousehold([]), null)).not.toContain('wet-mop');
  });

  it('adds a step for each listed smoke source and for a smoky cooking fuel, once', () => {
    const home: Household['home'] = {
      rooms: [],
      cookingFuel: 'kerosene',
      indoorSources: ['smoking', 'solid_fuel'],
    };
    const steps = ids({ ...testHousehold([]), home }, 'good');
    expect(steps.filter((id) => id.startsWith('source-'))).toEqual(['source-smoking', 'source-solid-fuel']);
  });

  it('corrects the plant belief always and the cycling belief when someone cycles on a poor day', () => {
    const cycling = testActivity({
      kind: 'commute',
      travel: { mode: 'cycle', fuel: null, distanceKm: 4, occupancy: 1, roundTrip: true },
    });
    expect(ids(testHousehold([cycling]), 'poor')).toEqual(
      expect.arrayContaining(['myth-plants', 'myth-cycling']),
    );
    expect(ids(testHousehold([cycling]), 'moderate')).not.toContain('myth-cycling');
  });
});
