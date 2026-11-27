// Air data at the boundary: places, CPCB stations, the reading on the station or modelled path, and the forecast.
import { z } from 'zod';
import { INDIA_BOUNDS, MAX_FORECAST_HOURS, STATION_RADIUS_KM } from '../../config/limits.js';
import { boundedText, isoDateSchema, isoDateTimeSchema } from '../../lib/schemas/common.js';
import { factIdSchema, sourceSchema } from '../../lib/schemas/facts.js';
import { aqiBandSchema, naqiEstimateSchema, pollutantIdSchema } from '../naqi/schemas.js';

const latitude = z.number().min(INDIA_BOUNDS.minLat).max(INDIA_BOUNDS.maxLat);
const longitude = z.number().min(INDIA_BOUNDS.minLon).max(INDIA_BOUNDS.maxLon);

/** A point in India. Requests carrying a point outside India are rejected. */
export const locationSchema = z.strictObject({ lat: latitude, lon: longitude });

/** How a place answer was found: town search, an exact PIN, or the centre of the PINs sharing its first digits. */
export const placeResolutionSchema = z.enum(['search', 'pin_exact', 'pin_prefix']);

/** How rough a PIN prefix answer is: the prefix used, how many known PINs share it, how far most lie from its centre. */
export const pinRoughnessSchema = z.strictObject({
  prefix: z.string().regex(/^\d{3,4}$/),
  pins: z.int().min(1),
  spreadKm: z.number().min(0),
});

/**
 * A place found by search, limited to India. resolution, label and roughness say what was understood and how:
 * label reads like "PIN 110092, East Delhi, Delhi"; roughness is set only for a PIN answered from its prefix.
 * They are optional so places saved before they existed still load.
 */
export const placeSchema = z.strictObject({
  id: boundedText(40),
  name: boundedText(120),
  district: boundedText(120).nullable(),
  state: boundedText(120).nullable(),
  postcode: boundedText(12).nullable(),
  lat: latitude,
  lon: longitude,
  resolution: placeResolutionSchema.optional(),
  label: boundedText(200).optional(),
  roughness: pinRoughnessSchema.nullable().optional(),
});

/** A CPCB monitoring station. name is the feed's station id, such as "JNU, Delhi - DPCC". */
export const stationSchema = z.strictObject({
  name: boundedText(160),
  city: boundedText(120),
  state: boundedText(120),
  lat: latitude,
  lon: longitude,
});

/**
 * One pollutant row of a station as CPCB publishes it. All values are sub-indices, not concentrations, and null
 * where CPCB wrote NA. hourlySubIndex is the latest hour; avg, min and max cover the averaging period, and the
 * station AQI CPCB publishes is the highest avg.
 */
export const stationPollutantSchema = z.strictObject({
  pollutant: pollutantIdSchema,
  hourlySubIndex: z.number().min(0).nullable(),
  avg: z.number().min(0).nullable(),
  min: z.number().min(0).nullable(),
  max: z.number().min(0).nullable(),
});

/** A station as parsed and checked from the feed, before distance and freshness are known. */
export const stationRecordSchema = z.strictObject({
  station: stationSchema,
  aqiValue: z.int().min(0).nullable(),
  predominant: pollutantIdSchema.nullable(),
  pollutants: z.array(stationPollutantSchema).max(7),
  readingHour: isoDateTimeSchema,
});

/**
 * Which copy of CPCB's data served a station reading: the CAAQMS feed itself, whose AQI is CPCB's own, or the
 * data.gov.in copy, which has no AQI, so the AQI there is the highest sub-index by CPCB's rule.
 */
export const stationProviderSchema = z.enum(['cpcb_feed', 'data_gov_in']);

/**
 * The station path of the air card, used when a station with at least one pollutant value lies within 50 km.
 * aqi is null when CPCB published no AQI for it. stale is worked out when the response is made; a view showing a
 * cached response works it out again from readingHour and FEED_STALE_AFTER_MINUTES. provider says which copy of
 * the data served it; the server always sets it, and it is optional only so older copies still parse.
 */
export const stationReadingSchema = z.strictObject({
  path: z.literal('station'),
  station: stationSchema,
  distanceKm: z.number().min(0).max(STATION_RADIUS_KM),
  aqi: z
    .strictObject({ value: z.int().min(0), band: aqiBandSchema, predominant: pollutantIdSchema.nullable() })
    .nullable(),
  pollutants: z.array(stationPollutantSchema).max(7),
  readingHour: isoDateTimeSchema,
  stale: z.boolean(),
  source: sourceSchema,
  provider: stationProviderSchema.optional(),
});

/**
 * The modelled path. Never a measurement. reason says why no station reading is used; nearestStationKm is the
 * distance to the nearest station of any kind, null when the feed gave no stations.
 */
export const modelledReadingSchema = z.strictObject({
  path: z.literal('modelled'),
  reason: z.enum(['no_station_in_range', 'no_station_reading', 'feed_unavailable']),
  estimate: naqiEstimateSchema,
  modelHour: isoDateTimeSchema,
  nearestStationKm: z.number().min(0).nullable(),
  source: sourceSchema,
});

/** Neither a station nor the model answered for this point. */
export const unavailableReadingSchema = z.strictObject({
  path: z.literal('unavailable'),
  reason: z.enum(['feed_and_model_down', 'no_station_and_model_down']),
});

/** What the air card shows, by path. */
export const airReadingSchema = z.discriminatedUnion('path', [
  stationReadingSchema,
  modelledReadingSchema,
  unavailableReadingSchema,
]);

/**
 * Why the station data could not be read just now: updating, the source was being rebuilt and answered with
 * stations missing; busy, it asked us to slow down or this server is holding back its calls; no_answer, it did not
 * answer in time or failed; unusable, it sent something the app cannot use.
 */
export const feedProblemSchema = z.enum(['updating', 'busy', 'no_answer', 'unusable']);

/**
 * State of the CPCB feed. fetch failed with a feedHour means the last good snapshot is in use;
 * fetch failed with feedHour null means nothing is cached. stale means feedHour is older than three hours.
 * problem says why fetch failed; the server always sets it then, and it is optional so older copies still parse.
 */
export const feedStatusSchema = z.strictObject({
  fetch: z.enum(['ok', 'failed']),
  feedHour: isoDateTimeSchema.nullable(),
  stale: z.boolean(),
  problem: feedProblemSchema.optional(),
});

/** One modelled hour in micrograms per cubic metre, CO included. null where the model gave no value. */
export const hourlyAirSchema = z.strictObject({
  time: isoDateTimeSchema,
  pm25: z.number().min(0).nullable(),
  pm10: z.number().min(0).nullable(),
  no2: z.number().min(0).nullable(),
  so2: z.number().min(0).nullable(),
  o3: z.number().min(0).nullable(),
  co: z.number().min(0).nullable(),
});

/**
 * The hour by hour model series: the past day for the estimate and the hours ahead that decide which are cleaner.
 * Always labelled as a forecast. issuedAt is when it was fetched. Times carry the +05:30 offset, which the adapter
 * adds when the upstream gives local times without one.
 */
export const hourCurveSchema = z.strictObject({
  kind: z.literal('model_forecast'),
  issuedAt: isoDateTimeSchema,
  hours: z.array(hourlyAirSchema).max(MAX_FORECAST_HOURS),
  source: sourceSchema,
});

/** GRAP stage for Delhi NCR from the order in the data file. Absent everywhere else. */
export const grapNoticeSchema = z.strictObject({
  region: z.literal('delhi_ncr'),
  stage: z.enum(['none', 'I', 'II', 'III', 'IV']),
  orderDate: isoDateSchema,
  factId: factIdSchema,
});
