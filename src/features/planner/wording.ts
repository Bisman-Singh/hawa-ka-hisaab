// What the model returns when it words a plan: which candidates, in what order, and their text. No numbers.
import { z } from 'zod';
import { allUnique, boundedText } from '../../lib/schemas/common.js';
import { itemIdSchema } from './schemas.js';

/**
 * The model's reply for a plan. Each item names a candidate computed in code; the planner checks the ids against
 * the candidates it sent and keeps every number, time and effect from the candidate, never from the reply.
 */
export const planWordingSchema = z
  .strictObject({
    headline: boundedText(200),
    items: z
      .array(
        z.strictObject({
          candidateId: itemIdSchema,
          title: boundedText(160),
          why: boundedText(600),
          tradeOff: boundedText(400).nullable(),
        }),
      )
      .max(36),
  })
  .refine((wording) => allUnique(wording.items.map((item) => item.candidateId)), {
    error: 'each candidate may be chosen once',
  });
