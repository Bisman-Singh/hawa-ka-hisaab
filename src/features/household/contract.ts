// Contract for POST /api/intake, which turns a plain description into a household for the user to check.
import { z } from 'zod';
import { MAX_INTAKE_TEXT_CHARS } from '../../config/limits.js';
import { definePostRoute } from '../../lib/contract.js';
import { boundedText } from '../../lib/schemas/common.js';
import { fallbackReasonSchema, traceSchema } from '../../lib/schemas/trace.js';
import { householdSchema } from './schemas.js';

/** Body of POST /api/intake: the user's own description of who is at home and how the day goes. */
export const intakeRequestSchema = z.strictObject({ text: boundedText(MAX_INTAKE_TEXT_CHARS) });

/**
 * What the model must return for intake. unplaced holds phrases of the user's text it could not place, each an
 * exact substring of that text; assumed holds plain notes on anything it filled in, such as a default start time.
 */
export const intakeReplySchema = z.strictObject({
  household: householdSchema,
  unplaced: z.array(boundedText(200)).max(10),
  assumed: z.array(boundedText(200)).max(10),
});

/**
 * Body of the intake response. parsed carries the household for the user to check and edit.
 * unavailable means the model could not be used or its reply failed a check; the form still works and the user
 * fills it in. reason is the same as the trace's fallbackReason.
 */
export const intakeResponseSchema = z.discriminatedUnion('outcome', [
  intakeReplySchema.extend({ outcome: z.literal('parsed'), trace: traceSchema }),
  z.strictObject({
    outcome: z.literal('unavailable'),
    reason: fallbackReasonSchema,
    trace: traceSchema,
  }),
]);

/** POST /api/intake. */
export const intakeRoute = definePostRoute({
  method: 'POST',
  path: '/api/intake',
  body: intakeRequestSchema,
  response: intakeResponseSchema,
});
