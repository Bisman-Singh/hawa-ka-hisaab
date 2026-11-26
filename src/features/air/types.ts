// Types for the air feature and the ports its providers implement.
import type { z } from 'zod';
import type { HttpFailure } from '../../lib/http.js';
import type { Result } from '../../lib/result.js';
import type { airResponseSchema, placesResponseSchema } from './contract.js';
import type { airReadingSchema, feedStatusSchema, grapNoticeSchema, hourCurveSchema } from './schemas.js';
import type { hourlyAirSchema, locationSchema, modelledReadingSchema, placeSchema } from './schemas.js';
import type { stationPollutantSchema, stationReadingSchema, stationRecordSchema } from './schemas.js';
import type { stationSchema, unavailableReadingSchema } from './schemas.js';

/** A point in India. */
export type Location = z.infer<typeof locationSchema>;

/** A place found by search. */
export type Place = z.infer<typeof placeSchema>;

/** A CPCB station. */
export type Station = z.infer<typeof stationSchema>;

/** One pollutant row of a station. */
export type StationPollutant = z.infer<typeof stationPollutantSchema>;

/** A station as parsed from the feed. */
export type StationRecord = z.infer<typeof stationRecordSchema>;

/** The station path of the air card. */
export type StationReading = z.infer<typeof stationReadingSchema>;

/** The modelled path of the air card. */
export type ModelledReading = z.infer<typeof modelledReadingSchema>;

/** Neither source answered. */
export type UnavailableReading = z.infer<typeof unavailableReadingSchema>;

/** What the air card shows. */
export type AirReading = z.infer<typeof airReadingSchema>;

/** State of the CPCB feed. */
export type FeedStatus = z.infer<typeof feedStatusSchema>;

/** One modelled hour. */
export type HourlyAir = z.infer<typeof hourlyAirSchema>;

/** The forecast curve. */
export type HourCurve = z.infer<typeof hourCurveSchema>;

/** GRAP stage for Delhi NCR. */
export type GrapNotice = z.infer<typeof grapNoticeSchema>;

/** Body of GET /api/places. */
export type PlacesResponse = z.infer<typeof placesResponseSchema>;

/** Body of GET /api/air. */
export type AirResponse = z.infer<typeof airResponseSchema>;

/** One parsed copy of the CPCB feed. feedHour is the feed's lastupdate as an ISO timestamp in IST. */
export interface StationFeed {
  readonly feedHour: string;
  readonly stations: readonly StationRecord[];
}

/** A read of the feed: fresh, the last good copy after a failed fetch, or nothing at all. */
export type StationFeedRead =
  | { readonly kind: 'fresh'; readonly feed: StationFeed }
  | { readonly kind: 'last_good'; readonly feed: StationFeed; readonly failure: HttpFailure }
  | { readonly kind: 'miss'; readonly failure: HttpFailure };

/** Port for the official station feed. Implementations cache, dedupe and bound their fetches. */
export interface AirProvider {
  readStations(): Promise<StationFeedRead>;
}

/** Port for the modelled hourly series at a point: the past day for estimates and the days ahead for the curve. */
export interface ForecastProvider {
  readHours(location: Location): Promise<Result<HourCurve, HttpFailure>>;
}

/** Port for place search within India. An empty list means nothing matched. */
export interface Geocoder {
  search(query: string): Promise<Result<readonly Place[], HttpFailure>>;
}
