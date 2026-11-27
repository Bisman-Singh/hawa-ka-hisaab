// Made-up sample communities from samples.json, checked on load with the community schema. They carry no person or
// organisation names, and the place is chosen apart, so a sample works in any city.
import { z } from 'zod';
import samples from './samples.json' with { type: 'json' };
import { communityInputSchema } from './schemas.js';
import type { CommunityInput } from './types.js';

/** A sample with a short description a reader can recognise. */
export interface CommunitySample {
  readonly id: string;
  readonly description: string;
  readonly input: CommunityInput;
}

const samplesSchema = z
  .array(
    z.strictObject({
      id: z.string().regex(/^[a-z][a-z0-9-]*$/),
      description: z.string(),
      input: communityInputSchema,
    }),
  )
  .length(2);

/** Two made-up communities: a housing society and a primary school. */
export const COMMUNITY_SAMPLES: readonly CommunitySample[] = samplesSchema.parse(samples);
