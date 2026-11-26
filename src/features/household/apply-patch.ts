// Applies one what-if patch to a household. Pure: the input is never changed, and the result is checked again.
import { err, ok, type Result } from '../../lib/result.js';
import { householdSchema } from './schemas.js';
import type { Activity, Home, Household, HouseholdPatch, Travel, TravelMode } from './types.js';

/** Why a patch could not be applied. */
export type PatchFailure = 'unknown_activity' | 'unknown_room' | 'no_travel' | 'invalid_household';

type ActivityPatch = Extract<HouseholdPatch, { activityId: string }>;
type HomePatch = Exclude<HouseholdPatch, ActivityPatch>;

const UNPOWERED: ReadonlySet<TravelMode> = new Set(['walk', 'cycle']);

type TravelPatch = Extract<ActivityPatch, { op: 'set_travel_mode' | 'set_occupancy' }>;

function changeTravel(travel: Travel, patch: TravelPatch): Travel {
  if (patch.op === 'set_occupancy') {
    return { ...travel, occupancy: patch.occupancy };
  }
  const unpowered = UNPOWERED.has(patch.mode);
  return unpowered
    ? { ...travel, mode: patch.mode, fuel: null, occupancy: 1 }
    : { ...travel, mode: patch.mode, fuel: patch.fuel };
}

function changeActivity(activity: Activity, patch: ActivityPatch): Result<Activity, PatchFailure> {
  switch (patch.op) {
    case 'set_start':
      return ok({ ...activity, start: patch.start });
    case 'set_setting':
      return ok({ ...activity, setting: patch.setting });
    case 'set_occupancy':
    case 'set_travel_mode':
      return activity.travel
        ? ok({ ...activity, travel: changeTravel(activity.travel, patch) })
        : err('no_travel');
  }
}

function changeHome(home: Home, patch: HomePatch): Result<Home, PatchFailure> {
  switch (patch.op) {
    case 'remove_indoor_source':
      return ok({ ...home, indoorSources: home.indoorSources.filter((source) => source !== patch.source) });
    case 'set_cooking_fuel':
      return ok({ ...home, cookingFuel: patch.fuel });
    case 'add_purifier': {
      if (!home.rooms.some((room) => room.id === patch.roomId)) {
        return err('unknown_room');
      }
      const purifier = { cadrM3PerHour: patch.cadrM3PerHour };
      return ok({
        ...home,
        rooms: home.rooms.map((room) => (room.id === patch.roomId ? { ...room, purifier } : room)),
      });
    }
  }
}

function patched(household: Household, patch: HouseholdPatch): Result<Household, PatchFailure> {
  if (!('activityId' in patch)) {
    const home = changeHome(household.home, patch);
    return home.ok ? ok({ ...household, home: home.value }) : home;
  }
  const current = household.activities.find((activity) => activity.id === patch.activityId);
  if (!current) {
    return err('unknown_activity');
  }
  const next = changeActivity(current, patch);
  const activities = household.activities.map((activity) =>
    activity === current && next.ok ? next.value : activity,
  );
  return next.ok ? ok({ ...household, activities }) : next;
}

/** The household with the patch applied, checked against the household schema, or why it could not be. */
export function applyHouseholdPatch(
  household: Household,
  patch: HouseholdPatch,
): Result<Household, PatchFailure> {
  const result = patched(household, patch);
  if (!result.ok) {
    return result;
  }
  const checked = householdSchema.safeParse(result.value);
  return checked.success ? ok(checked.data) : err('invalid_household');
}
