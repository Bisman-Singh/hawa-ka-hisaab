// The trace behind every generated output, shown in the "how this was made" panel.
import { z } from 'zod';
import { jsonObjectSchema, jsonValueSchema } from '../json.js';
import { factValueSchema } from './facts.js';

/**
 * Why a model call did not produce a usable reply. disabled means no key is configured; rate_limited means
 * this client used its share of model calls; daily_cap means the whole app did.
 */
export const modelFailureKindSchema = z.enum([
  'disabled',
  'quota',
  'timeout',
  'invalid_reply',
  'upstream',
  'rate_limited',
  'daily_cap',
]);

/** Why the rules path was used instead of the model. */
export const fallbackReasonSchema = z.union([modelFailureKindSchema, z.literal('number_check_failed')]);

/** One calculator call the model made, with validated arguments and what the calculator returned. */
export const toolCallSchema = z.strictObject({
  name: z.string().min(1).max(64),
  args: jsonObjectSchema,
  result: jsonValueSchema.nullable(),
  failure: z.enum(['unknown_tool', 'invalid_arguments', 'failed']).nullable(),
});

/**
 * Outcome of checking every numeral in model text against the allowed numbers: the facts sent and the results of
 * the tool calls made, compared after normalising format, Devanagari digits included. unmatched lists the misses.
 */
export const numberCheckSchema = z.strictObject({
  status: z.enum(['passed', 'failed', 'not_run']),
  attempts: z.int().min(0).max(2),
  unmatched: z.array(z.string().max(40)).max(50),
});

/**
 * How an output was made: by the model, by the rules fallback or as a fixed reply written in code. cached is true
 * when a checked model reply to an identical request was reused from the last few minutes instead of a new call.
 */
export const traceSchema = z.strictObject({
  producedBy: z.enum(['model', 'rules', 'fixed_reply']),
  modelId: z.string().max(80).nullable(),
  fallbackReason: fallbackReasonSchema.nullable(),
  factsSent: z.array(factValueSchema).max(500),
  modelReply: z.string().max(80_000).nullable(),
  toolCalls: z.array(toolCallSchema).max(20),
  numberCheck: numberCheckSchema,
  cached: z.boolean().optional(),
});
