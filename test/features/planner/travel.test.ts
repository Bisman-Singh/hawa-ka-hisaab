// Tests for travel options and the swap item.
import { describe, expect, it } from 'vitest';
import type { Activity, Travel } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { travelOptions } from '../../../src/features/planner/travel.js';
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
