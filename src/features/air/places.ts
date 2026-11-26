// The Open-Meteo place search request, limited to India, and the check and mapping of its results to places.
// Open-Meteo leaves out the results key when nothing matched, and it returns nothing for six digit PINs.
import { z } from 'zod';
import { placeSchema } from './schemas.js';
import type { Place } from './types.js';

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

/** Most places asked for and returned. */
export const MAX_PLACES = 10;

/** The part of the search answer the app reads. Each result is checked on its own. */
export const geocodingSchema = z.object({ results: z.array(z.unknown()).max(100).default([]) });

/** The checked search answer. */
export type GeocodingAnswer = z.infer<typeof geocodingSchema>;

const resultSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country_code: z.literal('IN'),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
  postcodes: z.array(z.string()).optional(),
});

/** The request URL for a search in India, in English. */
export function geocodingUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: String(MAX_PLACES),
    language: 'en',
    format: 'json',
    countryCode: 'IN',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

function toPlace(raw: unknown): Place[] {
  const result = resultSchema.safeParse(raw);
  if (!result.success) {
    return [];
  }
  const { id, name, latitude, longitude, admin1, admin2, postcodes } = result.data;
  const label = [name, admin2, admin1].filter((part) => part !== undefined).join(', ');
  const place = placeSchema.safeParse({
    id: `place-${String(id)}`,
    name,
    district: admin2 ?? null,
    state: admin1 ?? null,
    postcode: postcodes?.[0] ?? null,
    lat: latitude,
    lon: longitude,
    resolution: 'search',
    label,
    roughness: null,
  });
  return place.success ? [place.data] : [];
}

/** Maps a checked answer to places in India. A result that fails its check, or lies outside India, is dropped. */
export function toPlaces(answer: GeocodingAnswer): Place[] {
  return answer.results.flatMap(toPlace).slice(0, MAX_PLACES);
}
