// Open-Meteo behind the ForecastProvider and Geocoder ports. The forecast is asked for the model grid cell nearest
// the point, so every point in a cell shares one call, and place searches are cached a day by their plain text.
import { forecastUrl, openMeteoAirSchema, toHourCurve } from '../../features/air/forecast.js';
import { geocodingSchema, geocodingUrl, toPlaces } from '../../features/air/places.js';
import type { z } from 'zod';
import type { ForecastProvider, Geocoder, Location } from '../../features/air/types.js';
import { roundTo } from '../../features/naqi/table.js';
import { UPSTREAM_TIMEOUT_MS } from '../../config/limits.js';
import { createTtlCache } from '../../lib/cache.js';
import { fetchJson, type HttpFailure } from '../../lib/http.js';
import { err, ok, type Result } from '../../lib/result.js';
import { UNLIMITED, type UpstreamOptions } from './budget.js';
import { retryAfterMs } from '../../features/air/failures.js';

/**
 * Grid step of the CAMS global model in degrees. Open-Meteo answers a point from the nearest grid node, so a point
 * moved to that node gets the same values: Delhi at 28.63, 77.22 and the node 28.8, 77.2 gave the same hours on
 * 27 Nov 2026, and the next node south did not. The node is at most 0.2 degrees away on each axis, about 30 km.
 */
export const MODEL_GRID_DEGREES = 0.4;

/** How long one cell's curve is reused. */
export const FORECAST_TTL_MS = 60 * 60_000;

/** Oldest curve still served while Open-Meteo fails or refuses: its 48 hours ahead still cover the day. */
export const FORECAST_MAX_AGE_MS = 12 * 3_600_000;

/** How long a place search is reused. */
export const PLACES_TTL_MS = 24 * 3_600_000;

/** Cells and searches each cache holds. India has about 2,000 land cells of the grid. */
export const OPEN_METEO_ENTRIES = 2000;

const MAX_BYTES = 256 * 1024;

/** The grid node nearest a point. India's bounds fall on nodes, so a node stays inside them. */
export function gridCell(location: Location): Location {
  const snap = (degrees: number) => roundTo(Math.round(degrees / MODEL_GRID_DEGREES) * MODEL_GRID_DEGREES, 1);
  return { lat: snap(location.lat), lon: snap(location.lon) };
}

/** A search text as it is cached and sent: one form per spelling, spaces collapsed, lower case. */
export function placeQueryKey(query: string): string {
  return query.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** How one kind of call is cached: its time to live, the oldest value served on failure, its check and mapping. */
interface CallSpec<T, V> {
  readonly ttlMs: number;
  readonly maxAgeMs: number;
  readonly schema: z.ZodType<T>;
  readonly map: (body: T) => V;
}

// One cached call per key. The budget is asked first, so a refused call is never made and never held against the
// next reader; while the upstream fails the last good value is served until it is maxAgeMs old.
function cachedCall<T, V>(options: UpstreamOptions, spec: CallSpec<T, V>) {
  const { fetcher, clock } = options;
  const cache = createTtlCache<V, HttpFailure>({
    ttlMs: spec.ttlMs,
    retryAfterFailureMs: retryAfterMs,
    maxEntries: OPEN_METEO_ENTRIES,
    clock,
  });
  return async (key: string, url: string): Promise<Result<V, HttpFailure>> => {
    const read = await cache.read(key, async () => {
      if (!(await (options.budget ?? UNLIMITED).allow())) {
        return err({ kind: 'over_budget' });
      }
      const body = await fetchJson(
        fetcher,
        { url, timeoutMs: UPSTREAM_TIMEOUT_MS, maxBytes: MAX_BYTES },
        spec.schema,
      );
      return body.ok ? ok(spec.map(body.value)) : body;
    });
    if (read.kind === 'fresh') {
      return ok(read.value);
    }
    const recent = read.kind === 'last_good' && clock.now() - read.storedAt <= spec.maxAgeMs;
    return recent ? ok(read.value) : err(read.error);
  };
}

/** Builds the forecast provider. A curve under twelve hours old is served while the upstream fails. */
export function createOpenMeteoForecast(options: UpstreamOptions): ForecastProvider {
  const call = cachedCall(options, {
    ttlMs: FORECAST_TTL_MS,
    maxAgeMs: FORECAST_MAX_AGE_MS,
    schema: openMeteoAirSchema,
    map: (body) => toHourCurve(body, options.clock.now()),
  });
  return {
    readHours: (location) => {
      const cell = gridCell(location);
      return call(`${String(cell.lat)},${String(cell.lon)}`, forecastUrl(cell));
    },
  };
}

/** Builds the place search, limited to India. The last good answer for a text is served while the upstream fails. */
export function createOpenMeteoGeocoder(options: UpstreamOptions): Geocoder {
  const call = cachedCall(options, {
    ttlMs: PLACES_TTL_MS,
    maxAgeMs: Number.POSITIVE_INFINITY,
    schema: geocodingSchema,
    map: toPlaces,
  });
  return {
    search: (query) => {
      const text = placeQueryKey(query);
      return call(text, geocodingUrl(text));
    },
  };
}
