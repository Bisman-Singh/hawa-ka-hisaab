// Contract for GET /api/health, which says the API is up and reports its clock.
import { z } from 'zod';
import { defineGetRoute } from './contract.js';
import { isoDateTimeSchema } from './schemas/common.js';

/**
 * Body of a health response. sources says which sources this instance is set up with: the direct CPCB feed on or
 * off, a data.gov.in key present or not, a model configured or not. Presence only, never a key or its length.
 * It is optional so older copies still parse.
 */
export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  time: isoDateTimeSchema,
  sources: z.strictObject({ cpcbFeed: z.boolean(), dataGovIn: z.boolean(), model: z.boolean() }).optional(),
});

/** GET /api/health. It takes no query and is never cached. */
export const healthRoute = defineGetRoute({
  method: 'GET',
  path: '/api/health',
  query: z.object({}),
  response: healthResponseSchema,
  cacheSeconds: 0,
});
