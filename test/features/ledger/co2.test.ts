// Tests for one traveller's trip CO2: known answers, occupancy, per passenger modes and missing inputs.
import { describe, expect, it } from 'vitest';
import type { Travel } from '../../../src/features/household/types.js';
import { travelCo2 } from '../../../src/features/ledger/co2.js';

const car: Travel = { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: 1, roundTrip: true };

describe('travelCo2', () => {
  it('counts both legs of a round trip with the hatchback petrol factor', () => {
    const trip = travelCo2(car);
    expect(trip?.low).toBeCloseTo(28 * 0.13, 10);
    expect(trip?.high).toBe(trip?.low);
    expect(trip?.factIds).toEqual(['co2-car-petrol']);
    expect(travelCo2({ ...car, roundTrip: false })?.low).toBeCloseTo(14 * 0.13, 10);
  });

  it('splits a vehicle among the people in it, but not a bus or train, which are per passenger', () => {
    expect(travelCo2({ ...car, occupancy: 2 })?.low).toBeCloseTo((28 * 0.13) / 2, 10);
    const bus = travelCo2({ mode: 'bus', fuel: null, distanceKm: 14, occupancy: 40, roundTrip: true });
    expect(bus?.low).toBeCloseTo(28 * 0.015161, 10);
    expect(bus?.occupancy).toBeNull();
    const rail = travelCo2({
      mode: 'suburban_rail',
      fuel: null,
      distanceKm: 10,
      occupancy: null,
      roundTrip: false,
    });
    expect(rail?.low).toBeCloseTo(10 * 0.007976, 10);
  });

  it('spans the fuels a vehicle comes in when the fuel is not given', () => {
    const unknown = travelCo2({ ...car, fuel: 'unknown' });
    expect(unknown?.low).toBeCloseTo(28 * 0.063, 10);
    expect(unknown?.high).toBeCloseTo(28 * 0.13, 10);
    const scooter = travelCo2({
      mode: 'two_wheeler',
      fuel: 'petrol',
      distanceKm: 10,
      occupancy: 1,
      roundTrip: false,
    });
    expect(scooter?.low).toBeCloseTo(0.29, 10);
    expect(scooter?.high).toBeCloseTo(0.334, 10);
  });

  it('gives zero for walking and cycling, with no factor cited', () => {
    expect(
      travelCo2({ mode: 'cycle', fuel: null, distanceKm: 5, occupancy: 1, roundTrip: true }),
    ).toMatchObject({ low: 0, high: 0, factIds: [] });
  });

  it('gives no figure without a distance, an occupancy or a cited factor', () => {
    expect(travelCo2({ ...car, distanceKm: null })).toBeNull();
    expect(travelCo2({ ...car, occupancy: null })).toBeNull();
    expect(travelCo2({ ...car, fuel: 'electric' })).toBeNull();
    expect(travelCo2({ ...car, fuel: null })).toBeNull();
    expect(travelCo2({ ...car, mode: 'two_wheeler', fuel: 'diesel' })).toBeNull();
    expect(
      travelCo2({ mode: 'metro', fuel: null, distanceKm: 10, occupancy: 1, roundTrip: false }),
    ).toBeNull();
    expect(
      travelCo2({ mode: 'school_bus', fuel: 'diesel', distanceKm: 10, occupancy: 30, roundTrip: false }),
    ).toBeNull();
  });

  it('shows its inputs: distance, legs, each factor and the people sharing', () => {
    expect(travelCo2(car)?.inputs.map((input) => [input.label, input.value])).toEqual([
      ['distance one way', 14],
      ['legs', 2],
      ['factor', 0.13],
      ['people in the vehicle', 1],
    ]);
  });
});
