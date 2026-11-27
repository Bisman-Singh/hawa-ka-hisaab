// Types inferred from the shared schemas, so each shape has one source of truth.
import type { z } from 'zod';
import type { apiErrorBodySchema, apiErrorCodeSchema } from './api-error.js';
import type { healthResponseSchema } from './health.js';
import type { languageSchema, rangeSchema } from './schemas/common.js';
import type { factSchema, factValueSchema, sourceSchema } from './schemas/facts.js';
import type { fallbackReasonSchema, guardCheckSchema, modelFailureKindSchema } from './schemas/trace.js';
import type { numberCheckSchema, toolCallSchema, traceSchema } from './schemas/trace.js';

/** A language code for generated text. */
export type Language = z.infer<typeof languageSchema>;

/** A closed numeric interval. */
export type Range = z.infer<typeof rangeSchema>;

/** A public document a fact comes from. */
export type Source = z.infer<typeof sourceSchema>;

/** A sourced number or quoted passage. */
export type Fact = z.infer<typeof factSchema>;

/** A labelled number sent to the model. */
export type FactValue = z.infer<typeof factValueSchema>;

/** Why a model call failed. */
export type ModelFailureKind = z.infer<typeof modelFailureKindSchema>;

/** Why the rules path was used. */
export type FallbackReason = z.infer<typeof fallbackReasonSchema>;

/** The check that refused a model reply. */
export type GuardCheck = z.infer<typeof guardCheckSchema>;

/** One recorded calculator call. */
export type ToolCallRecord = z.infer<typeof toolCallSchema>;

/** Result of the number guard. */
export type NumberCheck = z.infer<typeof numberCheckSchema>;

/** The trace for the "how this was made" panel. */
export type Trace = z.infer<typeof traceSchema>;

/** An error code an API response can carry. */
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** The JSON body of every error response. */
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

/** A failure a route handler returns. The server turns it into an error body and status. */
export type ApiFailure = ApiErrorBody['error'];

/** Body of GET /api/health. */
export type HealthResponse = z.infer<typeof healthResponseSchema>;
