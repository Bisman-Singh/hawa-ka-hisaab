// Tests for the what-if patches.
import { describe, expect, it } from 'vitest';
import { householdPatchSchema } from '../../../src/features/household/patch.js';

describe('householdPatchSchema', () => {
  it('accepts each kind of change', () => {
    const patches = [
      { op: 'set_travel_mode', activityId: 'a1', mode: 'metro', fuel: null },
      { op: 'set_occupancy', activityId: 'a1', occupancy: 3 },
      { op: 'set_start', activityId: 'a2', start: '16:00' },
      { op: 'set_setting', activityId: 'a2', setting: 'indoor' },
      { op: 'remove_indoor_source', source: 'mosquito_coil' },
      { op: 'set_cooking_fuel', fuel: 'induction' },
      { op: 'add_purifier', roomId: 'r1', cadrM3PerHour: 250 },
    ];
    for (const patch of patches) {
      expect(householdPatchSchema.safeParse(patch).success).toBe(true);
    }
  });

  it('refuses unknown operations and bad values', () => {
    expect(householdPatchSchema.safeParse({ op: 'delete_member', memberId: 'm1' }).success).toBe(false);
    expect(
      householdPatchSchema.safeParse({ op: 'set_start', activityId: 'a2', start: '25:00' }).success,
    ).toBe(false);
  });
});
