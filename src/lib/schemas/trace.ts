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

/**
 * The check that refused a model reply: its JSON shape, markup, hidden characters, a third script, a link, a
 * number not supplied, a misquote, a medicine or treatment, or a task rule such as an unknown candidate id.
 */
export const guardCheckSchema = z.enum([
  'schema',
  'markup',
  'hidden',
  'script',
  'link',
  'numbers',
  'quotes',
  'medicine',
  'treatment',
  'unplaced',
  'name',
  'label',
  'measure',
  'ids',
  'one_place',
  'actions_changed',
  'wrong_script',
  'numbers_dropped',
  'too_long',
]);

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
 * refusedBy names the check that refused the model's last reply; a refused reply's text is never carried, so
 * modelReply is null then, and what was refused is told only by the check and the unmatched numbers.
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
  refusedBy: guardCheckSchema.optional(),
});
