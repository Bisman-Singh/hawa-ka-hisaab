// Contract for GET /api/health, which says the API is up and reports its clock.
import { z } from 'zod';
import { defineGetRoute } from './contract.js';
import { isoDateTimeSchema } from './schemas/common.js';

/** Body of a health response. */
export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  time: isoDateTimeSchema,
});

/** GET /api/health. It takes no query and is never cached. */
export const healthRoute = defineGetRoute({
  method: 'GET',
  path: '/api/health',
  query: z.object({}),
  response: healthResponseSchema,
  cacheSeconds: 0,
});
