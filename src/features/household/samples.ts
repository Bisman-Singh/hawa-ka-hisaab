// Made-up sample households: a sentence a user could type and the household it describes. No names anywhere.
// The data sits in samples.json and is checked on load with the same household schema as any user input.
import { z } from 'zod';
import { MAX_INTAKE_TEXT_CHARS } from '../../config/limits.js';
import { boundedText } from '../../lib/schemas/common.js';
import samples from './samples.json' with { type: 'json' };
import { householdSchema } from './schemas.js';
import type { Household } from './types.js';

/** A sample: a short id, the sentence a user could type, and the structured household it stands for. */
export interface SampleHousehold {
  readonly id: string;
  readonly description: string;
  readonly household: Household;
}

const samplesSchema = z
  .array(
    z.strictObject({
      id: z.string().regex(/^[a-z][a-z0-9-]*$/),
      description: boundedText(MAX_INTAKE_TEXT_CHARS),
      household: householdSchema,
    }),
  )
  .min(3)
  .max(5);

/**
 * The sample households, with clearly different lives: a family with a car and a child with asthma, an older
 * couple who cook on wood, a delivery rider who works outdoors, and students who cycle.
 */
export const SAMPLE_HOUSEHOLDS: readonly SampleHousehold[] = samplesSchema.parse(samples);
