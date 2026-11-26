// Contracts for GET /api/places and GET /api/air.
import { z } from 'zod';
import { INDIA_BOUNDS } from '../../config/limits.js';
import { defineGetRoute } from '../../lib/contract.js';
import { boundedText } from '../../lib/schemas/common.js';
import { airReadingSchema, feedStatusSchema, grapNoticeSchema, hourCurveSchema } from './schemas.js';
import { placeSchema } from './schemas.js';

/** Query of GET /api/places: a city, town or six digit PIN code. The text appears in the URL, so it is a place only. */
export const placesQuerySchema = z.object({ q: boundedText(80) });

/** Body of GET /api/places. An empty list means the place was not found. */
export const placesResponseSchema = z.strictObject({ places: z.array(placeSchema).max(10) });

const twoDecimals = (value: number): boolean => Math.round(value * 100) / 100 === value;

/**
 * Query of GET /api/air. Coordinates are rounded to two decimals, about a kilometre, before they go into a URL:
 * an exact home location never reaches request logs or a shared cache, and nearby callers share cached answers.
 */
export const airQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(INDIA_BOUNDS.minLat)
    .max(INDIA_BOUNDS.maxLat)
    .refine(twoDecimals, { error: 'round to two decimals' }),
  lon: z.coerce
    .number()
    .min(INDIA_BOUNDS.minLon)
    .max(INDIA_BOUNDS.maxLon)
    .refine(twoDecimals, { error: 'round to two decimals' }),
});

/** Body of GET /api/air: the reading, the feed state, the forecast curve and GRAP where it applies. */
export const airResponseSchema = z.strictObject({
  reading: airReadingSchema,
  feed: feedStatusSchema,
  forecast: hourCurveSchema.nullable(),
  grap: grapNoticeSchema.nullable(),
});

/** GET /api/places. Results change rarely, so they may be cached for a day. */
export const placesRoute = defineGetRoute({
  method: 'GET',
  path: '/api/places',
  query: placesQuerySchema,
  response: placesResponseSchema,
  cacheSeconds: 86_400,
});

/** GET /api/air. The feed updates hourly, so responses may be cached for five minutes. */
export const airRoute = defineGetRoute({
  method: 'GET',
  path: '/api/air',
  query: airQuerySchema,
  response: airResponseSchema,
  cacheSeconds: 300,
});
