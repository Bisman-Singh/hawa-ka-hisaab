// The household as the user describes it: members, the day's activities and the home. No names anywhere.
// Clock times are IST. A value the user did not give is null, never a guess.
import { z } from 'zod';
import { allUnique, boundedText, clockTimeSchema } from '../../lib/schemas/common.js';

/** A short lower case id for a member, activity or room, such as m1, a2 or r1. Every feature uses it. */
export const localIdSchema = z
  .string()
  .max(24)
  .regex(/^[a-z][a-z0-9_-]*$/);

/** Age groups. Infant, child and older adult come from here rather than from flags. */
export const ageGroupSchema = z.enum(['infant', 'child', 'teen', 'adult', 'older_adult']);

/** Conditions and roles that change advice for a member. */
export const memberFlagSchema = z.enum(['pregnant', 'asthma_or_lung', 'heart_condition', 'outdoor_worker']);

/** One person at home, described by age group and flags only. */
export const memberSchema = z.strictObject({
  id: localIdSchema,
  ageGroup: ageGroupSchema,
  flags: z.array(memberFlagSchema).max(4),
});

/** How a trip is made. */
export const travelModeSchema = z.enum([
  'walk',
  'cycle',
  'bus',
  'metro',
  'suburban_rail',
  'auto_rickshaw',
  'two_wheeler',
  'car',
  'taxi',
  'school_bus',
]);

/** Fuel of a motor vehicle. unknown is a motor vehicle whose fuel was not given; walking and cycling carry null. */
export const fuelSchema = z.enum(['petrol', 'diesel', 'cng', 'electric', 'unknown']);

const UNPOWERED = new Set(['walk', 'cycle']);

/**
 * A trip within an activity. distanceKm is one way and roundTrip doubles it. occupancy counts everyone in the
 * vehicle, the traveller included. Either is null when not given, and then no CO2 figure is shown.
 */
export const travelSchema = z
  .strictObject({
    mode: travelModeSchema,
    fuel: fuelSchema.nullable(),
    distanceKm: z.number().positive().max(300).nullable(),
    occupancy: z.int().min(1).max(60).nullable(),
    roundTrip: z.boolean(),
  })
  .refine((trip) => !UNPOWERED.has(trip.mode) || (trip.fuel === null && (trip.occupancy ?? 1) === 1), {
    error: 'walking and cycling have no fuel and one occupant',
  });

/** Kinds of activity the planner knows how to handle. */
export const activityKindSchema = z.enum([
  'commute',
  'school_run',
  'outdoor_exercise',
  'outdoor_play',
  'outdoor_work',
  'errand',
  'social',
  'other',
]);

/**
 * One part of the day: who, what, when, how long, where and whether the time can move. label is a short
 * description such as "football practice", never a name; null when none was given. Duration covers the
 * whole activity, travel included.
 */
export const activitySchema = z.strictObject({
  id: localIdSchema,
  memberIds: z.array(localIdSchema).min(1).max(12),
  kind: activityKindSchema,
  label: boundedText(60).nullable(),
  start: clockTimeSchema,
  durationMinutes: z.int().min(5).max(720),
  timing: z.enum(['fixed', 'flexible']),
  setting: z.enum(['outdoor', 'indoor', 'in_transit']),
  travel: travelSchema.nullable(),
});

/** A room with its rough area in square feet and its purifier. CADR is in cubic metres per hour. */
export const roomSchema = z.strictObject({
  id: localIdSchema,
  kind: z.enum(['bedroom', 'living', 'kitchen', 'study', 'other']),
  areaSqFt: z.number().positive().max(5000).nullable(),
  purifier: z.strictObject({ cadrM3PerHour: z.number().positive().max(5000).nullable() }).nullable(),
});

/** Sources of indoor smoke the household can name. */
export const indoorSourceSchema = z.enum(['mosquito_coil', 'incense', 'smoking', 'solid_fuel']);

/** What the household cooks with. */
export const cookingFuelSchema = z.enum([
  'lpg',
  'piped_gas',
  'induction',
  'biomass',
  'kerosene',
  'coal',
  'unknown',
]);

/** The home: rooms, cooking fuel and indoor sources. */
export const homeSchema = z.strictObject({
  rooms: z.array(roomSchema).max(10),
  cookingFuel: cookingFuelSchema,
  indoorSources: z.array(indoorSourceSchema).max(4),
});

/** A whole household. Ids are unique and every activity names members that exist. */
export const householdSchema = z
  .strictObject({
    members: z.array(memberSchema).min(1).max(12),
    activities: z.array(activitySchema).max(30),
    home: homeSchema,
  })
  .refine((household) => allUnique(household.members.map((member) => member.id)), {
    error: 'member ids must be unique',
  })
  .refine((household) => allUnique(household.activities.map((activity) => activity.id)), {
    error: 'activity ids must be unique',
  })
  .refine(
    (household) => {
      const ids = new Set(household.members.map((member) => member.id));
      return household.activities.every((activity) => activity.memberIds.every((id) => ids.has(id)));
    },
    { error: 'every activity must name existing members' },
  );
