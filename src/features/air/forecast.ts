// The Open-Meteo air quality request for a point and the check and mapping of its answer to the hour curve.
// Open-Meteo gives IST times without an offset when asked for Asia/Kolkata; the offset is added here.
import { z } from 'zod';
import { MAX_FORECAST_HOURS } from '../../config/limits.js';
import { OPEN_METEO_AIR } from '../../config/facts/air/sources.js';
import { istIso } from './geo.js';
import type { HourCurve, Location } from './types.js';

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Hours before the current hour for the trailing means, and hours from the current hour for the curve. */
export const FORECAST_WINDOW: Readonly<Record<'pastHours' | 'forecastHours', number>> = {
  pastHours: 24,
  forecastHours: 48,
};

const series = z.array(z.number().nullable()).max(MAX_FORECAST_HOURS);

/** The part of the Open-Meteo answer the app reads. The offset must be IST, as asked. */
export const openMeteoAirSchema = z.object({
  utc_offset_seconds: z.literal(19_800),
  hourly: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)).max(MAX_FORECAST_HOURS),
    pm2_5: series,
    pm10: series,
    nitrogen_dioxide: series,
    sulphur_dioxide: series,
    ozone: series,
    carbon_monoxide: series,
  }),
});

/** The checked Open-Meteo answer. */
export type OpenMeteoAir = z.infer<typeof openMeteoAirSchema>;

/** The request URL for a point, limited to the CAMS global model and the pollutants the index uses. */
export function forecastUrl(location: Location): string {
  const query = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    hourly: 'pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide',
    timezone: 'Asia/Kolkata',
    past_hours: String(FORECAST_WINDOW.pastHours),
    forecast_hours: String(FORECAST_WINDOW.forecastHours),
    domains: 'cams_global',
  });
  return `${ENDPOINT}?${query.toString()}`;
}

const valueAt = (values: readonly (number | null)[], index: number): number | null => {
  const value = values[index];
  return value !== undefined && value !== null && Number.isFinite(value) && value >= 0 ? value : null;
};

/** Maps a checked answer to the hour curve. A missing or negative value becomes null. */
export function toHourCurve(body: OpenMeteoAir, issuedAtMs: number): HourCurve {
  const hourly = body.hourly;
  return {
    kind: 'model_forecast',
    issuedAt: istIso(issuedAtMs),
    hours: hourly.time.map((time, index) => ({
      time: `${time}:00+05:30`,
      pm25: valueAt(hourly.pm2_5, index),
      pm10: valueAt(hourly.pm10, index),
      no2: valueAt(hourly.nitrogen_dioxide, index),
      so2: valueAt(hourly.sulphur_dioxide, index),
      o3: valueAt(hourly.ozone, index),
      co: valueAt(hourly.carbon_monoxide, index),
    })),
    source: OPEN_METEO_AIR,
  };
}
