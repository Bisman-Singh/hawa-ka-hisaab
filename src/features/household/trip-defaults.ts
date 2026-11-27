// A disclosed default for a trip the person drives: with no other rider mentioned, the people in a car or on a
// two-wheeler are the ones named for that trip. The note says so, and the person can change it in the form.
import type { Activity, Household, TravelMode } from './types.js';

const SELF_DRIVEN: Readonly<Partial<Record<TravelMode, string>>> = { car: 'car', two_wheeler: 'two-wheeler' };

/** A household with its defaults filled in, and one plain note for each default. */
export interface Defaulted {
  readonly household: Household;
  readonly notes: readonly string[];
}

function noteFor(activity: Activity, vehicle: string, riders: number): string {
  const who = riders === 1 ? '1 person' : `${String(riders)} people`;
  const name = activity.label ?? 'this trip';
  return `${who} in the ${vehicle} for ${name}, counting only who was named for it. Change it if others ride along.`;
}

/**
 * Fills the occupancy of car and two-wheeler trips that have none with the number of people on the activity, at
 * most room notes, and says so for each. Taxis and autos are left as they are, since their driver is not one of
 * the household and it is not settled whether the driver counts.
 */
export function withTripDefaults(household: Household, room: number): Defaulted {
  const notes: string[] = [];
  const activities = household.activities.map((activity) => {
    const travel = activity.travel;
    const vehicle = travel ? SELF_DRIVEN[travel.mode] : undefined;
    if (travel?.occupancy !== null || vehicle === undefined || notes.length >= room) {
      return activity;
    }
    const riders = Math.min(activity.memberIds.length, 60);
    notes.push(noteFor(activity, vehicle, riders));
    return { ...activity, travel: { ...travel, occupancy: riders } };
  });
  return { household: { ...household, activities }, notes };
}
