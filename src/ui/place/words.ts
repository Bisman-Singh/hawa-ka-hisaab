// The words of the place search and the air card, from words.json. Names, numbers and hours come from the data,
// and the station radius from the limits, never from the words.
import { STATION_RADIUS_KM } from '../../config/limits.js';
import type {
  GrapNotice,
  ModelledReading,
  StationProvider,
  UnavailableReading,
} from '../../features/air/types.js';
import type { PollutantId } from '../../features/naqi/types.js';
import { fill } from '../../lib/template.js';
import WORDS from './words.json' with { type: 'json' };

const RADIUS = { radius: STATION_RADIUS_KM };

/** Fixed text of the place field and the device location states. */
export const PLACE = WORDS.place;

/** Fixed text of the air card and its states. */
export const AIR = { ...WORDS.air, start: { ...WORDS.air.start, body: fill(WORDS.air.start.body, RADIUS) } };

/** What a missing AQI means for each copy of CPCB's data: the short line and the note under it. */
export const NO_AQI: Readonly<Record<StationProvider, { readonly short: string; readonly note: string }>> =
  WORDS.noAqi;

/** The GRAP stages in force, cumulative as CAQM orders them. */
export const GRAP_STAGES: Readonly<Record<GrapNotice['stage'], string>> = WORDS.grapStages;

/** Pollutant names as CPCB writes them, with subscript digits. */
export const POLLUTANT_NAME: Readonly<Record<PollutantId, string>> = WORDS.pollutants;

/** Why the modelled path is used, in words. km is the nearest station of any kind, when known. */
export function modelledWhy(reason: ModelledReading['reason'], km: number | null): string {
  const words = WORDS.modelledWhy;
  const nearest = km === null ? '' : fill(words.nearest, { km: km.toFixed(0) });
  return fill(words[reason], { ...RADIUS, nearest });
}

/** Why neither a station nor the model answered, in words. */
export function unavailableWhy(reason: UnavailableReading['reason']): string {
  return fill(WORDS.unavailableWhy[reason], RADIUS);
}

/** The problem and hint for a place not found, worded for a PIN code or for a town. */
export function notFound(query: string): { readonly error: string; readonly hint: string } {
  const words = PLACE.notFound[/^\d{6}$/.test(query.replace(/\s+/g, '')) ? 'pin' : 'name'];
  return { error: fill(words.error, { query }), hint: words.hint };
}
