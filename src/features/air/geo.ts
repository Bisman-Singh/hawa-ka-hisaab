// Great circle distance, coordinate rounding and IST timestamps, shared by the air code.
import { roundTo } from '../naqi/table.js';
import type { Location } from './types.js';

const EARTH_RADIUS_KM = 6371.0088;
const HOUR_MS = 3_600_000;
const IST_OFFSET_MS = 19_800_000;

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great circle distance between two points in kilometres, by the haversine formula on a mean earth radius. */
export function distanceKm(from: Location, to: Location): number {
  const dLat = radians(to.lat - from.lat);
  const dLon = radians(to.lon - from.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A point rounded to the given decimals, so exact home locations are never passed on. */
export function roundLocation(location: Location, decimals: number): Location {
  return { lat: roundTo(location.lat, decimals), lon: roundTo(location.lon, decimals) };
}

/** An epoch time as an ISO timestamp in IST, such as 2026-11-24T22:00:00+05:30. */
export function istIso(epochMs: number): string {
  return `${new Date(epochMs + IST_OFFSET_MS).toISOString().slice(0, 19)}+05:30`;
}

/** The start of the IST clock hour an epoch time falls in. */
export function istHourStart(epochMs: number): number {
  return Math.floor((epochMs + IST_OFFSET_MS) / HOUR_MS) * HOUR_MS - IST_OFFSET_MS;
}
