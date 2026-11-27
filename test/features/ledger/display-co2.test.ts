// Tests for travel CO₂ laid out for the page: kilograms for one person, there and back or one way, who shares the
// vehicle, a reason for a range, and a range across zero never headlined as a saving.
import { describe, expect, it } from 'vitest';
import { co2ChangeEffect, co2ForPeriod } from '../../../src/features/ledger/co2-change.js';
import { effectDisplay } from '../../../src/features/ledger/display.js';
import type { Travel } from '../../../src/features/household/types.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import { sampleWorking } from '../../support/samples.js';

const co2 = (overrides: Partial<Extract<Effect, { kind: 'co2' }>>): Effect => ({
  kind: 'co2',
  changeKg: -2.8,
  range: null,
  occupancy: 1,
  per: 'trip',
  working: sampleWorking(),
  ...overrides,
});

const car: Travel = { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: 1, roundTrip: true };
const bus: Travel = { ...car, mode: 'bus', fuel: null };

describe('effectDisplay for CO2', () => {
  it('gives kilograms for one person, there and back, and how many are in the vehicle now', () => {
    const swap = co2ChangeEffect(car, bus);
    expect(swap && effectDisplay(swap)).toEqual({
      direction: 'less',
      headline: '3.2 kg less',
      detail: 'there and back, 1 in the vehicle now',
      note: null,
      sentence: '3.2 kg less CO2 for each person, there and back, 1 in the vehicle now.',
    });
    expect(swap && effectDisplay(swap, 'hi')).toMatchObject({
      headline: '3.2 किलो कम',
      detail: 'आना-जाना, अभी गाड़ी में 1',
    });
  });

  it('says who shares a car, one way trips, days and weeks', () => {
    const pool = co2ChangeEffect(car, { ...car, occupancy: 2 });
    expect(pool && effectDisplay(pool).detail).toBe('there and back, shared by 2');
    const oneWay = co2ChangeEffect({ ...car, roundTrip: false }, { ...bus, roundTrip: false });
    expect(oneWay && effectDisplay(oneWay).detail).toBe('one way, 1 in the vehicle now');
    const week = pool && co2ForPeriod(pool, 'week', 5);
    expect(week && effectDisplay(week).detail).toBe('a week, shared by 2');
  });

  it('gives a range with the reason for it, by unknown fuel or by two-wheeler kind', () => {
    const unknown = co2ChangeEffect({ ...car, fuel: 'unknown' }, bus);
    expect(unknown && effectDisplay(unknown)).toMatchObject({ headline: '1.3 to 3.2 kg less' });
    expect(unknown && effectDisplay(unknown).note).toMatch(/fuel was not given/);
    const scooter: Travel = {
      mode: 'two_wheeler',
      fuel: 'petrol',
      distanceKm: 3,
      occupancy: 1,
      roundTrip: false,
    };
    const ride = co2ChangeEffect(scooter, { ...scooter, mode: 'bus', fuel: null });
    expect(ride && effectDisplay(ride).note).toMatch(/motorcycle and a scooter/);
  });

  it('headlines a rise as more, nothing as no change, and a range across zero as up to more', () => {
    const cycle: Travel = { mode: 'cycle', fuel: null, distanceKm: 5, occupancy: 1, roundTrip: true };
    const added = co2ChangeEffect(cycle, { ...cycle, mode: 'bus' });
    expect(added && effectDisplay(added)).toMatchObject({
      direction: 'more',
      headline: '0.15 kg more',
      detail: 'there and back',
    });
    const none = co2({ changeKg: 0.001 });
    expect(effectDisplay(none)).toMatchObject({ direction: 'none', headline: 'No change' });
    const across = co2({ changeKg: 0.1, range: { low: -0.4, high: 0.6 } });
    expect(effectDisplay(across)).toMatchObject({ direction: 'mixed', headline: 'Up to 0.6 kg more' });
    expect(effectDisplay(across).detail).toMatch(/^or 0.4 kg less/);
  });
});
