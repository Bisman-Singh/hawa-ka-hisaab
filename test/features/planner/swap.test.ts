// Tests for the swap item: the option with a CO2 figure leads, honest trade-offs, what to add for a figure, and
// toggles that cite every fact behind their effects.
import { describe, expect, it } from 'vitest';
import type { Activity, Travel } from '../../../src/features/household/types.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { swapAction, swapTradeOff, toggleFor } from '../../../src/features/planner/swap.js';
import { travelOptions } from '../../../src/features/planner/travel.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';
import { sampleWorking } from '../../support/samples.js';

const trip = (travel: Travel, overrides: Partial<Activity> = {}): Activity =>
  testActivity({
    kind: 'commute',
    setting: 'in_transit',
    timing: 'fixed',
    label: 'office',
    travel,
    ...overrides,
  });
const car: Travel = { mode: 'car', fuel: 'petrol', distanceKm: 10, occupancy: 1, roundTrip: true };
const cycle: Travel = { mode: 'cycle', fuel: null, distanceKm: 5, occupancy: 1, roundTrip: true };
const exposure = (low: number, high: number): Effect => ({
  kind: 'exposure',
  change: { low, high },
  memberIds: ['m1'],
  working: sampleWorking(),
});

describe('swapAction', () => {
  it('leads with the option that has a CO2 figure and keeps the rest as toggles', () => {
    const action = swapAction(situationOf(planContext(testHousehold([trip(car)]), 'poor')), trip(car));
    expect(action?.template.title).toBe('Office: take the bus');
    expect(action?.whatIfs.map((toggle) => toggle.id)).toEqual(['metro-a1', 'carpool-a1']);
    expect(action?.template.tradeOff).toBe(
      'You may breathe in more than in a closed car with AC: up to 2.4 times as much, or 8% less than with the windows open.',
    );
  });

  it('says plainly what to add when a missing distance or rider count is why there is no CO2 figure', () => {
    const s = (activity: Activity) => situationOf(planContext(testHousehold([activity]), 'poor'));
    const riders = trip({ ...car, occupancy: null });
    expect(swapAction(s(riders), riders)?.template.why).toMatch(/Add how many people ride in the vehicle/);
    const distance = trip({ ...car, distanceKm: null });
    expect(swapAction(s(distance), distance)?.template.why).toMatch(/Add the distance one way/);
    const electric = trip({ ...car, fuel: 'electric', occupancy: null });
    expect(swapAction(s(electric), electric)?.template.why).not.toMatch(/Add/);
    expect(swapAction(s(trip(car)), trip(car))?.template.why).not.toMatch(/Add/);
    const noFactor = trip({
      mode: 'two_wheeler',
      fuel: 'diesel',
      distanceKm: 3,
      occupancy: 1,
      roundTrip: true,
    });
    const unfactored = swapAction(s(noFactor), noFactor);
    expect(unfactored?.effects.map((effect) => effect.kind)).toEqual(['exposure']);
    expect(unfactored?.template.why).not.toMatch(/Add/);
  });

  it('says more breathed in, never a cut, when every end of the range is a rise, and nothing for a cut', () => {
    const s = situationOf(planContext(testHousehold([trip(car)]), 'poor'));
    const rise = exposure(0.2, 1.5);
    expect(swapTradeOff(s, [rise])).toBe(
      'You may breathe in more on the way than you do now: 2.5 times as much.',
    );
    expect(swapTradeOff(s, [exposure(-0.6, -0.3)])).toBeNull();
  });

  it('says what a cyclist gains and gives up, and with no CO2 figure leads with the first option', () => {
    const off = swapAction(situationOf(planContext(testHousehold([trip(cycle)]), 'severe')), trip(cycle));
    expect(off?.template.why).toMatch(/on a cycle you breathe much harder/);
    expect(off?.template.tradeOff).toMatch(/adds CO₂/);
    const noDistance = trip({ ...car, distanceKm: null });
    const metro = swapAction(situationOf(planContext(testHousehold([noDistance]), 'good')), noDistance);
    expect(metro?.template.title).toBe('Office: take the bus');
    expect(metro?.effects.map((effect) => effect.kind)).toEqual(['exposure']);
  });

  it('is null with no options', () => {
    expect(
      swapAction(situationOf(planContext(testHousehold([testActivity()]), 'poor')), testActivity()),
    ).toBeNull();
  });

  it('builds a toggle citing every fact behind its effects', () => {
    const s = situationOf(planContext(testHousehold([trip(car)]), 'poor'));
    const [bus] = travelOptions(s, trip(car));
    expect(bus && toggleFor(s, trip(car), bus).factIds).toEqual(
      expect.arrayContaining(['co2-bus', 'co2-car-petrol', 'exposure-ratio-bus']),
    );
  });
});
