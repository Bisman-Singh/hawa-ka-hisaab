// Contract for POST /api/plan. The client sends the household each time; the server keeps nothing.
import { z } from 'zod';
import { definePostRoute } from '../../lib/contract.js';
import { clockTimeSchema, isoDateTimeSchema, languageSchema } from '../../lib/schemas/common.js';
import { traceSchema } from '../../lib/schemas/trace.js';
import { hourCurveSchema, locationSchema } from '../air/schemas.js';
import { householdSchema } from '../household/schemas.js';
import { aqiBandSchema } from '../naqi/schemas.js';
import { planSchema } from './schemas.js';

/** Body of POST /api/plan. The server fetches the air itself; the client never sends air values. */
export const planRequestSchema = z.strictObject({
  household: householdSchema,
  location: locationSchema,
  language: languageSchema,
});

/**
 * The air the plan was built on, so the plan, the air card and a compare view can be checked against each other.
 * forecastIssuedAt is null when no forecast curve was used.
 */
export const airBasisSchema = z.strictObject({
  path: z.enum(['station', 'modelled', 'unavailable']),
  band: aqiBandSchema.nullable(),
  readingHour: isoDateTimeSchema.nullable(),
  forecastIssuedAt: isoDateTimeSchema.nullable(),
});

/**
 * What the browser needs besides the plan to recompute a what-if exactly as the server would: the forecast hours
 * of the plan's date and the earliest move time the plan used. With the household, the plan's band and its date
 * these make the PlanContext for whatIfEffects.
 */
export const whatIfContextSchema = z.strictObject({
  curve: hourCurveSchema.nullable(),
  notBefore: clockTimeSchema.nullable(),
});

/**
 * Body of the plan response. The trace says whether the model or the rules path produced it. The server always
 * sends whatIfContext; it is optional only so responses saved or written before it existed still parse.
 */
export const planResponseSchema = z.strictObject({
  plan: planSchema,
  airBasis: airBasisSchema,
  trace: traceSchema,
  whatIfContext: whatIfContextSchema.optional(),
});

/** POST /api/plan. Over the model limit it still answers, on the rules path. */
export const planRoute = definePostRoute({
  method: 'POST',
  path: '/api/plan',
  body: planRequestSchema,
  response: planResponseSchema,
});
