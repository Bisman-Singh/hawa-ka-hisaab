// Air responses for the place and air card tests. Station values are copied from the saved CPCB feed; the
// modelled values are synthetic. Change one field per test.
import type { AirResponse, FeedStatus, ModelledReading, Place } from '../../../src/features/air/types.js';
import type { StationReading } from '../../../src/features/air/types.js';
import { vi } from 'vitest';
import type { Mock } from 'vitest';

type ComputedEstimate = Extract<ModelledReading['estimate'], { status: 'computed' }>;

/** The source record of the CPCB feed as the server sends it. */
export const CPCB_SOURCE = {
  title: 'CAAQMS hourly air quality index feed',
  publisher: 'Central Pollution Control Board',
  url: 'https://airquality.cpcb.gov.in/caaqms/rss_feed',
  published: null,
  retrieved: '2026-11-26',
};

/** A station reading at JNU, Delhi, at 22:00 IST on 24 Nov 2026. */
export function jnuReading(change: Partial<StationReading> = {}): StationReading {
  return {
    path: 'station',
    station: { name: 'JNU, Delhi - DPCC', city: 'Delhi', state: 'Delhi', lat: 28.54, lon: 77.17 },
    distanceKm: 2.14,
    aqi: { value: 246, band: 'poor', predominant: 'pm25' },
    pollutants: [
      { pollutant: 'pm10', hourlySubIndex: 178, avg: 153, min: 96, max: 185 },
      { pollutant: 'pm25', hourlySubIndex: 293, avg: 246, min: 89, max: 321 },
      { pollutant: 'o3', hourlySubIndex: null, avg: 12, min: 3, max: 40 },
    ],
    readingHour: '2026-11-24T22:00:00+05:30',
    stale: false,
    source: CPCB_SOURCE,
    provider: 'cpcb_feed',
    ...change,
  };
}

/** A computed estimate led by PM10, with synthetic means. */
export function computedEstimate(change: Partial<ComputedEstimate> = {}): ComputedEstimate {
  return {
    status: 'computed',
    value: 61,
    band: 'satisfactory',
    predominant: 'pm10',
    subIndices: [
      { pollutant: 'pm25', subIndex: 40, meanConcentration: 24.08, unit: 'ug_m3', averagingHours: 24 },
      { pollutant: 'pm10', subIndex: 61, meanConcentration: 61, unit: 'ug_m3', averagingHours: 24 },
      { pollutant: 'co', subIndex: 10, meanConcentration: 0.213, unit: 'mg_m3', averagingHours: 8 },
    ],
    ...change,
  };
}

/** A modelled estimate for a hill town with no station in range. */
export function modelledReading(change: Partial<ModelledReading> = {}): ModelledReading {
  return {
    path: 'modelled',
    reason: 'no_station_in_range',
    estimate: computedEstimate(),
    modelHour: '2026-11-24T22:00:00+05:30',
    nearestStationKm: 107.4,
    source: {
      title: 'Air Quality API, CAMS global model',
      publisher: 'Open-Meteo',
      url: 'https://open-meteo.com/en/docs/air-quality-api',
      published: null,
      retrieved: '2026-11-26',
    },
    ...change,
  };
}

/** The feed state of a fresh read at the fixture hour. */
export const FRESH_FEED: FeedStatus = { fetch: 'ok', feedHour: '2026-11-24T22:00:00+05:30', stale: false };

/** A whole air response around a reading. */
export function airResponse(change: Partial<AirResponse> = {}): AirResponse {
  return { reading: jnuReading(), feed: FRESH_FEED, forecast: null, grap: null, ...change };
}

/** A town found by search. */
export function townPlace(change: Partial<Place> = {}): Place {
  return {
    id: 'place-1264733',
    name: 'Lucknow',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    postcode: null,
    lat: 26.84,
    lon: 80.92,
    resolution: 'search',
    label: 'Lucknow, Lucknow, Uttar Pradesh',
    roughness: null,
    ...change,
  };
}

/** A PIN answered exactly from the PIN table. */
export function pinPlace(change: Partial<Place> = {}): Place {
  return {
    id: 'pin-110092',
    name: 'PIN 110092',
    district: 'East Delhi',
    state: 'Delhi',
    postcode: '110092',
    lat: 28.64,
    lon: 77.3,
    resolution: 'pin_exact',
    label: 'PIN 110092, East Delhi, Delhi',
    roughness: null,
    ...change,
  };
}

/** A JSON response as fetch gives it. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Stubs the browser's fetch with an answer per call, and returns the mock to read the calls from. */
export function stubFetch(
  answer: (url: string, init?: RequestInit) => Response | Promise<Response>,
): Mock<(url: string, init?: RequestInit) => Promise<Response>> {
  const fetcher = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url, init) =>
    Promise.resolve(answer(url, init)),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
