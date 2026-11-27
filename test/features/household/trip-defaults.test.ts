// Tests for the disclosed default of who rides in a driven car or on a two-wheeler: filled only when missing,
// said in a note the person can act on, never for taxis or autos, and only while there is room for the note.
import { describe, expect, it } from 'vitest';
import { withTripDefaults } from '../../../src/features/household/trip-defaults.js';
import type { Activity, Household, Travel } from '../../../src/features/household/types.js';

const drive = (travel: Partial<Travel>, overrides: Partial<Activity> = {}): Activity => ({
  id: 'a1',
  memberIds: ['m1'],
  kind: 'commute',
  label: 'office commute',
  start: '08:30',
  durationMinutes: 60,
  timing: 'fixed',
  setting: 'in_transit',
  travel: { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: null, roundTrip: true, ...travel },
  ...overrides,
});

const household = (activities: Activity[]): Household => ({
  members: [
    { id: 'm1', ageGroup: 'adult', flags: [] },
    { id: 'm2', ageGroup: 'adult', flags: [] },
  ],
  activities,
  home: { rooms: [], cookingFuel: 'lpg', indoorSources: [] },
});

describe('withTripDefaults', () => {
  it('counts the people named for a driven trip when no rider count was given, and says so', () => {
    const result = withTripDefaults(household([drive({})]), 10);
    expect(result.household.activities[0]?.travel?.occupancy).toBe(1);
    expect(result.notes).toEqual([
      '1 person in the car for office commute, counting only who was named for it. Change it if others ride along.',
    ]);
    const pair = withTripDefaults(
      household([drive({ mode: 'two_wheeler' }, { memberIds: ['m1', 'm2'], label: null })]),
      10,
    );
    expect(pair.notes[0]).toBe(
      '2 people in the two-wheeler for this trip, counting only who was named for it. Change it if others ride along.',
    );
  });

  it('leaves a given count, a taxi, an auto, a walk and a trip with no room for its note as they are', () => {
    const kept = [
      drive({ occupancy: 3 }),
      drive({ mode: 'taxi' }, { id: 'a2' }),
      drive({ mode: 'auto_rickshaw' }, { id: 'a3' }),
    ];
    const result = withTripDefaults(household([...kept, drive({}, { id: 'a4', travel: null })]), 10);
    expect(result.notes).toEqual([]);
    expect(result.household.activities.map((activity) => activity.travel?.occupancy ?? null)).toEqual([
      3,
      null,
      null,
      null,
    ]);
    expect(withTripDefaults(household([drive({})]), 0).household.activities[0]?.travel?.occupancy).toBeNull();
  });
});
