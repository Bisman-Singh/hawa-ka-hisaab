// Tests for the household contract: shape, limits, integrity and the absence of names.
import { describe, expect, it } from 'vitest';
import { activitySchema, householdSchema, localIdSchema } from '../../../src/features/household/schemas.js';
import { travelSchema } from '../../../src/features/household/schemas.js';
import { sampleHousehold } from '../../support/samples.js';

describe('householdSchema', () => {
  it('accepts the sample household', () => {
    expect(householdSchema.safeParse(sampleHousehold()).success).toBe(true);
  });

  it('has no place for a name on a member', () => {
    const household = sampleHousehold();
    const named = { ...household, members: [{ id: 'm1', ageGroup: 'adult', flags: [], name: 'A person' }] };
    expect(householdSchema.safeParse(named).success).toBe(false);
  });

  it('refuses duplicate member ids', () => {
    const household = sampleHousehold();
    const members = [...household.members, { id: 'm1', ageGroup: 'teen', flags: [] }];
    const result = householdSchema.safeParse({ ...household, members });
    expect(result.error?.issues.map((issue) => issue.message)).toContain('member ids must be unique');
  });

  it('refuses duplicate activity ids', () => {
    const household = sampleHousehold();
    const activities = household.activities.map((activity) => ({ ...activity, id: 'a1' }));
    const result = householdSchema.safeParse({ ...household, activities });
    expect(result.error?.issues.map((issue) => issue.message)).toContain('activity ids must be unique');
  });

  it('refuses an activity that names a member who does not exist', () => {
    const household = sampleHousehold();
    const activities = household.activities.map((activity) => ({ ...activity, memberIds: ['m9'] }));
    const result = householdSchema.safeParse({ ...household, activities });
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'every activity must name existing members',
    );
  });

  it('needs at least one member and caps the size', () => {
    const household = sampleHousehold();
    expect(householdSchema.safeParse({ ...household, members: [], activities: [] }).success).toBe(false);
    const many = Array.from({ length: 13 }, (_, index) => ({
      id: `m${String(index)}`,
      ageGroup: 'adult',
      flags: [],
    }));
    expect(householdSchema.safeParse({ ...household, members: many, activities: [] }).success).toBe(false);
  });
});

describe('travelSchema', () => {
  it('counts the traveller in the occupancy and needs a positive distance', () => {
    const trip = { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: 1, roundTrip: true };
    expect(travelSchema.safeParse(trip).success).toBe(true);
    expect(travelSchema.safeParse({ ...trip, occupancy: 0 }).success).toBe(false);
    expect(travelSchema.safeParse({ ...trip, distanceKm: 0 }).success).toBe(false);
  });
});

describe('travel rules', () => {
  const walk = { mode: 'walk', fuel: null, distanceKm: 1.5, occupancy: 1, roundTrip: true };

  it('leaves distance and occupancy null when not given, instead of guessing', () => {
    const trip = { mode: 'car', fuel: 'unknown', distanceKm: null, occupancy: null, roundTrip: false };
    expect(travelSchema.safeParse(trip).success).toBe(true);
    expect(travelSchema.safeParse({ ...walk, occupancy: null }).success).toBe(true);
  });

  it('refuses a fuel or extra occupants on a walk or a cycle ride', () => {
    for (const trip of [
      { ...walk, fuel: 'diesel' },
      { ...walk, occupancy: 7 },
      { ...walk, mode: 'cycle', fuel: 'petrol' },
    ]) {
      expect(travelSchema.safeParse(trip).error?.issues[0]?.message).toBe(
        'walking and cycling have no fuel and one occupant',
      );
    }
  });
});

describe('activity label and ids', () => {
  it('allows an activity without a label', () => {
    const [activity] = sampleHousehold().activities;
    expect(activitySchema.safeParse({ ...activity, label: null }).success).toBe(true);
  });

  it('keeps ids short and lower case', () => {
    expect(localIdSchema.safeParse('m1').success).toBe(true);
    for (const id of ['M1', '1m', 'a b', 'x'.repeat(25)]) {
      expect(localIdSchema.safeParse(id).success).toBe(false);
    }
  });
});
