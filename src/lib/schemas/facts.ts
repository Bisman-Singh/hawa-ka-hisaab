// Facts with their public sources. Every number the app shows traces back to one of these.
import { z } from 'zod';
import { boundedText, isoDateSchema, languageSchema, rangeSchema } from './common.js';

/** A stable fact id in lower case kebab form, such as co2-car-petrol. */
export const factIdSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** A public document a fact comes from, with a link a reader can open. */
export const sourceSchema = z.strictObject({
  title: boundedText(240),
  publisher: boundedText(160),
  url: z.url({ protocol: /^https$/ }),
  published: boundedText(40).nullable(),
  retrieved: isoDateSchema,
});

const numberFactSchema = z.strictObject({
  kind: z.literal('number'),
  id: factIdSchema,
  title: boundedText(160),
  value: z.number(),
  range: rangeSchema.nullable(),
  unit: z.string().max(40),
  source: sourceSchema,
});

const textFactSchema = z.strictObject({
  kind: z.literal('text'),
  id: factIdSchema,
  title: boundedText(160),
  text: boundedText(2000),
  lang: languageSchema,
  source: sourceSchema,
});

/** A sourced fact: a number with its unit and optional range, or a passage quoted verbatim. */
export const factSchema = z.discriminatedUnion('kind', [numberFactSchema, textFactSchema]);

/** A number sent to the model with its label. The number guard checks model text against these. */
export const factValueSchema = z.strictObject({
  id: factIdSchema,
  label: boundedText(120),
  value: z.number(),
  unit: z.string().max(40),
});
