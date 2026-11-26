// What-if patches: small structured changes to a household that the browser applies and recomputes at once.
import { z } from 'zod';
import { clockTimeSchema } from '../../lib/schemas/common.js';
import { cookingFuelSchema, fuelSchema, indoorSourceSchema, localIdSchema } from './schemas.js';
import { travelModeSchema } from './schemas.js';

/** One change a what-if toggle makes. Only toggles with a cited factor carry a patch. */
export const householdPatchSchema = z.discriminatedUnion('op', [
  z.strictObject({
    op: z.literal('set_travel_mode'),
    activityId: localIdSchema,
    mode: travelModeSchema,
    fuel: fuelSchema.nullable(),
  }),
  z.strictObject({
    op: z.literal('set_occupancy'),
    activityId: localIdSchema,
    occupancy: z.int().min(1).max(60),
  }),
  z.strictObject({ op: z.literal('set_start'), activityId: localIdSchema, start: clockTimeSchema }),
  z.strictObject({
    op: z.literal('set_setting'),
    activityId: localIdSchema,
    setting: z.enum(['outdoor', 'indoor', 'in_transit']),
  }),
  z.strictObject({ op: z.literal('remove_indoor_source'), source: indoorSourceSchema }),
  z.strictObject({ op: z.literal('set_cooking_fuel'), fuel: cookingFuelSchema }),
  z.strictObject({
    op: z.literal('add_purifier'),
    roomId: localIdSchema,
    cadrM3PerHour: z.number().positive().max(5000),
  }),
]);
