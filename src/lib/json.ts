// JSON values as a type and a schema, for tool arguments and results that cross the model boundary.
import { z } from 'zod';

/** Any value that survives JSON.stringify and JSON.parse unchanged. */
export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** Validates a JsonValue of any depth. */
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/** Validates a JSON object, such as the arguments of a tool call. */
export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
