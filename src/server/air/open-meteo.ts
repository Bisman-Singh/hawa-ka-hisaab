// Open-Meteo behind the ForecastProvider and Geocoder ports. The forecast is asked for a point rounded to one
// decimal, finer than the model grid needs, and cached for half an hour per point.
import { forecastUrl, openMeteoAirSchema, toHourCurve } from '../../features/air/forecast.js';
import { roundLocation } from '../../features/air/geo.js';
import { geocodingSchema, geocodingUrl, toPlaces } from '../../features/air/places.js';
import type { ForecastProvider, Geocoder, HourCurve } from '../../features/air/types.js';
import { UPSTREAM_TIMEOUT_MS } from '../../config/limits.js';
import { createTtlCache } from '../../lib/cache.js';
import type { Clock } from '../../lib/clock.js';
import { fetchJson, type Fetcher, type HttpFailure } from '../../lib/http.js';
import { err, ok } from '../../lib/result.js';

/** How long one point's curve is reused. */
export const FORECAST_TTL_MS = 30 * 60_000;

const MAX_BYTES = 256 * 1024;

/** Builds the forecast provider. */
export function createOpenMeteoForecast(fetcher: Fetcher, clock: Clock): ForecastProvider {
  const cache = createTtlCache<HourCurve, HttpFailure>({
    ttlMs: FORECAST_TTL_MS,
    retryAfterFailureMs: 2 * 60_000,
    maxEntries: 500,
    clock,
  });
  return {
    readHours: async (location) => {
      const point = roundLocation(location, 1);
      const read = await cache.read(`${String(point.lat)},${String(point.lon)}`, async () => {
        const request = { url: forecastUrl(point), timeoutMs: UPSTREAM_TIMEOUT_MS, maxBytes: MAX_BYTES };
        const body = await fetchJson(fetcher, request, openMeteoAirSchema);
        return body.ok ? ok(toHourCurve(body.value, clock.now())) : body;
      });
      return read.kind === 'miss' ? err(read.error) : ok(read.value);
    },
  };
}

/** Builds the place search, limited to India. */
export function createOpenMeteoGeocoder(fetcher: Fetcher): Geocoder {
  return {
    search: async (query) => {
      const request = { url: geocodingUrl(query), timeoutMs: UPSTREAM_TIMEOUT_MS, maxBytes: MAX_BYTES };
      const body = await fetchJson(fetcher, request, geocodingSchema);
      return body.ok ? ok(toPlaces(body.value)) : body;
    },
  };
}
