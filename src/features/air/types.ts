// Types for the air feature and the ports its providers implement.
import type { z } from 'zod';
import type { HttpFailure } from '../../lib/http.js';
import type { Result } from '../../lib/result.js';
import type { airResponseSchema, placesResponseSchema } from './contract.js';
import type { airReadingSchema, feedProblemSchema, feedStatusSchema } from './schemas.js';
import type { grapNoticeSchema, hourCurveSchema } from './schemas.js';
import type { hourlyAirSchema, locationSchema, modelledReadingSchema, placeSchema } from './schemas.js';
import type { pinRoughnessSchema, placeResolutionSchema, stationProviderSchema } from './schemas.js';
import type { stationPollutantSchema, stationReadingSchema, stationRecordSchema } from './schemas.js';
import type { stationSchema, unavailableReadingSchema } from './schemas.js';

/** A point in India. */
export type Location = z.infer<typeof locationSchema>;

/** A place found by search. */
export type Place = z.infer<typeof placeSchema>;

/** How a place answer was found. */
export type PlaceResolution = z.infer<typeof placeResolutionSchema>;

/** How rough a PIN prefix answer is. */
export type PinRoughness = z.infer<typeof pinRoughnessSchema>;

/** Which copy of CPCB's data served a reading. */
export type StationProvider = z.infer<typeof stationProviderSchema>;

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

/** Why the station data could not be read just now, in the words the screen chooses from. */
export type FeedProblem = z.infer<typeof feedProblemSchema>;

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

/** One parsed copy of the station data. feedHour is the latest station hour as an ISO timestamp in IST. */
export interface StationFeed {
  readonly provider: StationProvider;
  readonly feedHour: string;
  readonly stations: readonly StationRecord[];
}

/**
 * Why a station read is not fresh: an upstream failure, or incomplete when the source answered while it was being
 * rebuilt, with stations missing or only part of their rows there.
 */
export type FeedFailure = HttpFailure | { readonly kind: 'incomplete' };

/**
 * A read of the feed: fresh, a usable copy after a failed or incomplete fetch, or nothing at all. A last_good copy
 * may mix the stations that came complete just now with the last good reading of the others.
 */
export type StationFeedRead =
  | { readonly kind: 'fresh'; readonly feed: StationFeed }
  | { readonly kind: 'last_good'; readonly feed: StationFeed; readonly failure: FeedFailure }
  | { readonly kind: 'miss'; readonly failure: FeedFailure };

/**
 * Port for the official station data. Implementations cache, dedupe and bound their fetches. near is the point
 * asked about: a provider that cannot read every station at once reads those near it, and without near none.
 */
export interface AirProvider {
  readStations(near?: Location): Promise<StationFeedRead>;
}

/** Port for the modelled hourly series at a point: the past day for estimates and the days ahead for the curve. */
export interface ForecastProvider {
  readHours(location: Location): Promise<Result<HourCurve, HttpFailure>>;
}

/** Port for place search within India. An empty list means nothing matched. */
export interface Geocoder {
  search(query: string): Promise<Result<readonly Place[], HttpFailure>>;
}

/** The PIN table: centres and labels by PIN, prefix centres with count and spread, and the state of each prefix. */
export interface PinTables {
  readonly centres: ReadonlyMap<string, readonly [lat: number, lon: number]>;
  readonly labels: ReadonlyMap<string, readonly [district: string, state: string]>;
  readonly prefixes: ReadonlyMap<
    string,
    readonly [lat: number, lon: number, count: number, spreadKm: number]
  >;
  readonly prefixStates: ReadonlyMap<string, string | null>;
}

/** Port for the PIN table, which is server-side data loaded once on first use. */
export interface PinDirectory {
  load(): Promise<PinTables>;
}

/** Every source the air feature reads, grouped as one server dependency. stationProviders names the chain in order. */
export interface AirSources {
  readonly stations: AirProvider;
  readonly stationProviders: readonly StationProvider[];
  readonly forecast: ForecastProvider;
  readonly geocoder: Geocoder;
  readonly pins: PinDirectory;
}
