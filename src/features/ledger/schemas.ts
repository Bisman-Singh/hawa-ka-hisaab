// Effects and their working: every number a plan item shows, with the inputs, formula and cited factors.
import { z } from 'zod';
import { boundedText, rangeSchema } from '../../lib/schemas/common.js';
import { factIdSchema } from '../../lib/schemas/facts.js';
import { localIdSchema } from '../household/schemas.js';

/** One input to a calculation. A factor taken from a fact must name that fact. */
export const workingInputSchema = z
  .strictObject({
    label: boundedText(120),
    value: z.number(),
    unit: z.string().max(40),
    from: z.enum(['household', 'fact', 'air', 'forecast']),
    factId: factIdSchema.nullable(),
  })
  .refine((input) => input.from !== 'fact' || input.factId !== null, {
    error: 'an input taken from a fact must name the fact',
  });

/** The working behind a number, shown one tap away: inputs, the formula in words and the facts used. */
export const workingSchema = z.strictObject({
  formula: boundedText(300),
  inputs: z.array(workingInputSchema).min(1).max(12),
  factIds: z.array(factIdSchema).min(1).max(12),
});

/** A relative change as a fraction. It can rise without bound but cannot fall below minus one, a cut of all of it. */
export const relativeChangeSchema = rangeSchema.refine((range) => range.low >= -1, {
  error: 'a relative change cannot fall below -1',
});

/**
 * The size of one choice's effect. Exposure is a relative change with a range, such as -0.6 to -0.3 for a 30 to
 * 60 percent cut; there is no dose or "PM added" kind. CO2 is the change in kg for one traveller, negative for a
 * saving, with the occupancy it assumes; per trip means the activity's travel as described, both legs when it is
 * a round trip.
 */
export const effectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('exposure'),
    change: relativeChangeSchema,
    memberIds: z.array(localIdSchema).min(1).max(12),
    working: workingSchema,
  }),
  z.strictObject({
    kind: z.literal('co2'),
    changeKg: z.number(),
    range: rangeSchema.nullable(),
    occupancy: z.int().min(1).max(60),
    per: z.enum(['trip', 'day', 'week']),
    working: workingSchema,
  }),
]);

/** A computed figure with a label and its working, for indoor sizing and community facts. */
export const figureSchema = z.strictObject({
  label: boundedText(160),
  value: z.number(),
  unit: z.string().max(40),
  working: workingSchema,
});
