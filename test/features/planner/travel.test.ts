// Tests for travel options and the swap item.
import { describe, expect, it } from 'vitest';
import type { Activity, Travel } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { swapAction, toggleFor, travelOptions } from '../../../src/features/planner/travel.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

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
const options = (activity: Activity, band: Parameters<typeof planContext>[1] = 'poor') =>
  travelOptions(situationOf(planContext(testHousehold([activity]), band)), activity).map(
    (choice) => choice.key,
  );

describe('travelOptions', () => {
  it('offers the bus, the metro and a shared ride from a car', () => {
    expect(options(trip(car))).toEqual(['bus', 'metro', 'carpool']);
    expect(options(trip({ ...car, mode: 'two_wheeler' }))).toEqual(['bus', 'metro']);
  });

  it('offers a ride off the cycle only on a poor or worse day', () => {
    expect(options(trip(cycle), 'poor')).toEqual(['bus', 'metro']);
    expect(options(trip(cycle), 'moderate')).toEqual([]);
  });

  it('offers nothing for work trips, trips without travel, or a bus trip', () => {
    expect(options(trip(car, { kind: 'outdoor_work' }))).toEqual([]);
    expect(options(testActivity())).toEqual([]);
    expect(options(trip({ ...car, mode: 'bus', fuel: null }))).toEqual([]);
  });

  it('drops the shared ride and the bus CO2 when the occupancy is unknown', () => {
    const unknown = trip({ ...car, occupancy: null });
    expect(options(unknown)).toEqual(['bus', 'metro']);
  });
});

describe('swapAction', () => {
  it('leads with the option that has a CO2 figure and keeps the rest as toggles', () => {
    const action = swapAction(situationOf(planContext(testHousehold([trip(car)]), 'poor')), trip(car));
    expect(action?.template.title).toBe('Office: take the bus');
    expect(action?.whatIfs.map((toggle) => toggle.id)).toEqual(['metro-a1', 'carpool-a1']);
    expect(action?.template.tradeOff).toMatch(/breathe in more/);
  });

  it('says what a cyclist gains and gives up, and with no CO2 figure leads with the first option', () => {
    const off = swapAction(situationOf(planContext(testHousehold([trip(cycle)]), 'severe')), trip(cycle));
    expect(off?.template.why).toMatch(/on a cycle you breathe much harder/);
    expect(off?.template.tradeOff).toMatch(/adds CO2/);
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
    const [bus] = travelOptions(situationOf(planContext(testHousehold([trip(car)]), 'poor')), trip(car));
    expect(bus && toggleFor(trip(car), bus).factIds).toEqual(
      expect.arrayContaining(['co2-bus', 'co2-car-petrol', 'exposure-ratio-bus']),
    );
  });
});
