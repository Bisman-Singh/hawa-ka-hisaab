// The error body every API route returns on failure, and the HTTP status for each error code.
import { z } from 'zod';

/** Error codes an API response can carry. */
export const apiErrorCodeSchema = z.enum([
  'invalid_request',
  'unsupported_media_type',
  'payload_too_large',
  'forbidden_origin',
  'not_found',
  'rate_limited',
  'upstream_unavailable',
  'internal',
]);

/** Where a request failed validation and why. Messages describe the rule, never the value sent. */
export const apiIssueSchema = z.strictObject({
  path: z.string().max(200),
  message: z.string().max(200),
});

/** The JSON body of every error response. */
export const apiErrorBodySchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: z.string().max(200),
    issues: z.array(apiIssueSchema).max(20),
  }),
});
