// Tests for the change in one traveller's CO2 when a trip changes, and its scaling to a day or week.
import { describe, expect, it } from 'vitest';
import type { Travel } from '../../../src/features/household/types.js';
import { co2ChangeEffect, co2ForPeriod } from '../../../src/features/ledger/co2-change.js';
import { effectSchema } from '../../../src/features/ledger/schemas.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import { sampleExposureEffect } from '../../support/samples.js';

const car: Travel = { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: 1, roundTrip: true };
const bus: Travel = { ...car, mode: 'bus', fuel: null };

/** The CO2 effect, or a failed expectation when the effect is missing or of another kind. */
function co2(effect: Effect | null): Extract<Effect, { kind: 'co2' }> {
  if (effect?.kind !== 'co2') {
    throw new Error('expected a CO2 effect');
  }
  return effect;
}
const unknownFuel: Travel['fuel'] = 'unknown';

describe('co2ChangeEffect', () => {
  it('gives the bus saving against driving alone, negative for a saving', () => {
    const effect = co2ChangeEffect(car, bus);
    expect(co2(effect).changeKg).toBeCloseTo(28 * 0.015161 - 28 * 0.13, 10);
    expect(co2(effect).range).toBeNull();
    expect(co2(effect).occupancy).toBe(1);
    expect(effectSchema.safeParse(effect).success).toBe(true);
  });

  it('pairs the same car fuel by fuel when only the occupancy changes, so an unknown fuel stays a fair range', () => {
    const unknown = { ...car, fuel: unknownFuel };
    const effect = co2ChangeEffect(unknown, { ...unknown, occupancy: 2 });
    expect(co2(effect).range?.low).toBeCloseTo(-(28 * 0.13) / 2, 10);
    expect(co2(effect).range?.high).toBeCloseTo(-(28 * 0.063) / 2, 10);
    const labels = effect?.working.inputs.map((input) => input.label) ?? [];
    expect(labels.filter((label) => label.startsWith('Instead'))).toEqual(['Instead: people in the vehicle']);
    expect(co2(effect).occupancy).toBe(2);
  });

  it('crosses the ends when the vehicle changes and the fuel is unknown', () => {
    const effect = co2ChangeEffect({ ...car, fuel: 'unknown' }, bus);
    expect(co2(effect).range?.low).toBeCloseTo(28 * 0.015161 - 28 * 0.13, 10);
  });

  it('shows a rise when a cycle trip becomes a bus trip', () => {
    const cycle: Travel = { mode: 'cycle', fuel: null, distanceKm: 5, occupancy: 1, roundTrip: true };
    const effect = co2ChangeEffect(cycle, { ...cycle, mode: 'bus' });
    expect(co2(effect).changeKg).toBeCloseTo(10 * 0.015161, 10);
  });

  it('gives nothing without figures on both sides or with no factor at all', () => {
    expect(co2ChangeEffect({ ...car, distanceKm: null }, bus)).toBeNull();
    expect(co2ChangeEffect(car, { ...car, mode: 'metro', fuel: null })).toBeNull();
    const walk: Travel = { mode: 'walk', fuel: null, distanceKm: 2, occupancy: 1, roundTrip: true };
    expect(co2ChangeEffect(walk, { ...walk, mode: 'cycle' })).toBeNull();
  });
});

describe('co2ForPeriod', () => {
  it('scales a trip figure to a week with the trips stated, and leaves other effects alone', () => {
    const trip = co2(co2ChangeEffect({ ...car, fuel: 'unknown' }, bus));
    const week = co2(co2ForPeriod(trip, 'week', 5));
    expect(week.per).toBe('week');
    expect(week.changeKg).toBeCloseTo(trip.changeKg * 5, 10);
    expect(week.range?.low).toBeCloseTo((trip.range?.low ?? 0) * 5, 10);
    expect(week.working.inputs.at(-1)).toMatchObject({ label: 'trips a week', value: 5 });
    const day = co2(co2ForPeriod(co2(co2ChangeEffect(car, bus)), 'day', 2));
    expect(day).toMatchObject({ per: 'day', range: null });
    expect(co2ForPeriod(sampleExposureEffect(), 'week', 5)).toEqual(sampleExposureEffect());
    expect(co2ForPeriod(week, 'day', 2)).toBe(week);
  });
});
