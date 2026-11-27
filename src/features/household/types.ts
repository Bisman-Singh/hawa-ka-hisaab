// Types for the household feature, inferred from its schemas.
import type { z } from 'zod';
import type { intakeRequestSchema, intakeResponseSchema } from './contract.js';
import type { householdPatchSchema } from './patch.js';
import type {
  activityKindSchema,
  activitySchema,
  ageGroupSchema,
  fuelSchema,
  homeSchema,
  householdSchema,
  indoorSourceSchema,
  memberFlagSchema,
  memberSchema,
  roomSchema,
  travelModeSchema,
  travelSchema,
} from './schemas.js';

/** An age group. */
export type AgeGroup = z.infer<typeof ageGroupSchema>;

/** A member flag. */
export type MemberFlag = z.infer<typeof memberFlagSchema>;

/** One person at home. */
export type Member = z.infer<typeof memberSchema>;

/** A travel mode. */
export type TravelMode = z.infer<typeof travelModeSchema>;

/** A vehicle fuel. */
export type Fuel = z.infer<typeof fuelSchema>;

/** A trip within an activity. */
export type Travel = z.infer<typeof travelSchema>;

/** A kind of activity. */
export type ActivityKind = z.infer<typeof activityKindSchema>;

/** One part of the day. */
export type Activity = z.infer<typeof activitySchema>;

/** A room. */
export type Room = z.infer<typeof roomSchema>;

/** An indoor smoke source. */
export type IndoorSource = z.infer<typeof indoorSourceSchema>;

/** The home. */
export type Home = z.infer<typeof homeSchema>;

/** A whole household. */
export type Household = z.infer<typeof householdSchema>;

/** One what-if change. */
export type HouseholdPatch = z.infer<typeof householdPatchSchema>;

/** Body of POST /api/intake. */
export type IntakeRequest = z.infer<typeof intakeRequestSchema>;

/** Body of the intake response. */
export type IntakeResponse = z.infer<typeof intakeResponseSchema>;
