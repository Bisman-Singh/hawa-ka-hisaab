// Contract for POST /api/ask: a follow-up question under the plan, answered through calculator tools.
import { z } from 'zod';
import { MAX_QUESTION_CHARS } from '../../config/limits.js';
import { definePostRoute } from '../../lib/contract.js';
import { boundedText, languageSchema } from '../../lib/schemas/common.js';
import { factIdSchema } from '../../lib/schemas/facts.js';
import { traceSchema } from '../../lib/schemas/trace.js';
import { locationSchema } from '../air/schemas.js';
import { householdSchema } from '../household/schemas.js';
import { aqiBandSchema } from '../naqi/schemas.js';

/** Body of POST /api/ask. The question is passed to the model as data, never as instructions. */
export const askRequestSchema = z.strictObject({
  question: boundedText(MAX_QUESTION_CHARS),
  household: householdSchema,
  location: locationSchema,
  language: languageSchema,
});

/**
 * Body of the ask response. medical_reply is the fixed text written in code for questions about
 * symptoms, medicines or diagnosis; the model is never asked those. factIds name the sources of the advice,
 * such as the health ministry advisory for the band. The trace lists the tool calls.
 */
export const askResponseSchema = z.strictObject({
  kind: z.enum(['answer', 'medical_reply']),
  text: boundedText(2000),
  language: languageSchema,
  band: aqiBandSchema.nullable(),
  factIds: z.array(factIdSchema).max(12),
  trace: traceSchema,
});

/** POST /api/ask. Over the model limit it answers on the rules path. */
export const askRoute = definePostRoute({
  method: 'POST',
  path: '/api/ask',
  body: askRequestSchema,
  response: askResponseSchema,
});
