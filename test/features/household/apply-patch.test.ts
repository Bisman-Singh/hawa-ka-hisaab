// Tests for applying a what-if patch to a household.
import { describe, expect, it } from 'vitest';
import { sample } from '../../support/plan-fixtures.js';
import { applyHouseholdPatch } from '../../../src/features/household/apply-patch.js';

const family = sample('family-car-asthma');

describe('applyHouseholdPatch', () => {
  it('changes a start, a setting and an occupancy without touching the input', () => {
    const before = JSON.stringify(family);
    const moved = applyHouseholdPatch(family, { op: 'set_start', activityId: 'a2', start: '14:00' });
    expect(moved.ok && moved.value.activities[1]?.start).toBe('14:00');
    const inside = applyHouseholdPatch(family, { op: 'set_setting', activityId: 'a2', setting: 'indoor' });
    expect(inside.ok && inside.value.activities[1]?.setting).toBe('indoor');
    const shared = applyHouseholdPatch(family, { op: 'set_occupancy', activityId: 'a1', occupancy: 3 });
    expect(shared.ok && shared.value.activities[0]?.travel?.occupancy).toBe(3);
    expect(JSON.stringify(family)).toBe(before);
  });

  it('switches mode, dropping fuel and extra riders for walking or cycling', () => {
    const bus = applyHouseholdPatch(family, {
      op: 'set_travel_mode',
      activityId: 'a1',
      mode: 'bus',
      fuel: null,
    });
    expect(bus.ok && bus.value.activities[0]?.travel).toMatchObject({
      mode: 'bus',
      fuel: null,
      occupancy: 1,
    });
    const pooled = {
      ...family,
      activities: family.activities.map((a) =>
        a.id === 'a1' && a.travel ? { ...a, travel: { ...a.travel, occupancy: 2 } } : a,
      ),
    };
    const cycle = applyHouseholdPatch(pooled, {
      op: 'set_travel_mode',
      activityId: 'a1',
      mode: 'cycle',
      fuel: 'petrol',
    });
    expect(cycle.ok && cycle.value.activities[0]?.travel).toMatchObject({
      mode: 'cycle',
      fuel: null,
      occupancy: 1,
    });
  });

  it('changes the home: removes a source, sets the fuel, adds a purifier', () => {
    const noCoil = applyHouseholdPatch(family, { op: 'remove_indoor_source', source: 'mosquito_coil' });
    expect(noCoil.ok && noCoil.value.home.indoorSources).toEqual([]);
    const fuel = applyHouseholdPatch(family, { op: 'set_cooking_fuel', fuel: 'induction' });
    expect(fuel.ok && fuel.value.home.cookingFuel).toBe('induction');
    const purifier = applyHouseholdPatch(family, { op: 'add_purifier', roomId: 'r1', cadrM3PerHour: 300 });
    expect(purifier.ok && purifier.value.home.rooms[0]?.purifier).toEqual({ cadrM3PerHour: 300 });
    expect(purifier.ok && purifier.value.home.rooms[1]?.purifier).toEqual({ cadrM3PerHour: 250 });
  });

  it('refuses unknown activities and rooms, travel changes without travel, and results the schema refuses', () => {
    expect(applyHouseholdPatch(family, { op: 'set_start', activityId: 'zz', start: '10:00' })).toEqual({
      ok: false,
      error: 'unknown_activity',
    });
    expect(applyHouseholdPatch(family, { op: 'add_purifier', roomId: 'zz', cadrM3PerHour: 100 })).toEqual({
      ok: false,
      error: 'unknown_room',
    });
    expect(applyHouseholdPatch(family, { op: 'set_occupancy', activityId: 'a2', occupancy: 2 })).toEqual({
      ok: false,
      error: 'no_travel',
    });
    const students = sample('students-cycle');
    expect(applyHouseholdPatch(students, { op: 'set_occupancy', activityId: 'a1', occupancy: 2 })).toEqual({
      ok: false,
      error: 'invalid_household',
    });
  });
});
