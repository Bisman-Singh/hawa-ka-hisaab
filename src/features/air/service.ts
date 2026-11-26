// The two air questions the server answers: the air card at a point, and places for a search text.
// The planner and other routes call readAir for the same reading the air card shows.
import type { Clock } from '../../lib/clock.js';
import type { HttpFailure } from '../../lib/http.js';
import { ok, type Result } from '../../lib/result.js';
import { roundLocation } from './geo.js';
import { grapNoticeAt, nearNcr } from './grap.js';
import { resolvePin } from './pin.js';
import { buildAirResponse } from './reading.js';
import type { AirResponse, AirSources, GrapNotice, Location, Place } from './types.js';

const PIN = /^[1-9]\d{5}$/;

async function grapFor(sources: AirSources, location: Location): Promise<GrapNotice | null> {
  return nearNcr(location) ? grapNoticeAt(await sources.pins.load(), location) : null;
}

/**
 * The air card at a point. The point is first rounded to two decimals, about a kilometre, so an exact location
 * is never passed to a provider. The feed, the forecast and the GRAP check run side by side.
 */
export async function readAir(sources: AirSources, clock: Clock, location: Location): Promise<AirResponse> {
  const point = roundLocation(location, 2);
  const [feed, forecast, grap] = await Promise.all([
    sources.stations.readStations(point),
    sources.forecast.readHours(point),
    grapFor(sources, point),
  ]);
  return buildAirResponse({ location: point, feed, forecast, now: clock.now(), grap });
}

/** Places for a search text. Six digits, spaces ignored, go to the PIN table; anything else to the geocoder. */
export async function findPlaces(
  sources: AirSources,
  query: string,
): Promise<Result<readonly Place[], HttpFailure>> {
  const compact = query.replace(/\s+/g, '');
  if (PIN.test(compact)) {
    const place = resolvePin(await sources.pins.load(), compact);
    return ok(place ? [place] : []);
  }
  return sources.geocoder.search(query.trim());
}
