// The data.gov.in copy of the CPCB data: one row per station and pollutant, with no AQI. Rows are grouped into
// the same station records the feed gives, and the AQI is the one CPCB's rule gives from the averages.
import { z } from 'zod';
import type { Result } from '../../lib/result.js';
import type { PollutantId } from '../naqi/types.js';
import { stationFeedOf } from './cpcb-feed.js';
import { cpcbStampToIso, stationRecord } from './cpcb-station.js';
import { distanceKm } from './geo.js';
import type { Location, StationFeed, StationPollutant, StationRecord } from './types.js';

const RESOURCE = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';

/** Rows asked for one state. The largest, Maharashtra, had 665 on 26 Nov 2026. */
export const DATA_GOV_STATE_ROWS = 1500;

const cell = z.union([z.string(), z.number()]).transform(String).optional();

// Field ids as the live API gives them on 26 Nov 2026; the resource page shows them as pollutant_min and so on.
const rowSchema = z.object({
  state: z.string(),
  city: z.string(),
  station: z.string(),
  last_update: z.string(),
  latitude: cell,
  longitude: cell,
  pollutant_id: z.string(),
  min_value: cell,
  max_value: cell,
  avg_value: cell,
});

type Row = z.infer<typeof rowSchema>;

/** One answer of the resource as the app reads it. Each row is checked on its own. */
export const dataGovPageSchema = z.object({
  total: z.coerce.number().int().min(0),
  records: z.array(z.unknown()).max(DATA_GOV_STATE_ROWS),
});

/** The URL for one state's rows. The key goes in the api-key parameter, as the API requires, and nowhere else. */
export function dataGovStateUrl(apiKey: string, state: string): string {
  const query = new URLSearchParams({
    'api-key': apiKey,
    format: 'json',
    limit: String(DATA_GOV_STATE_ROWS),
    'filters[state]': state,
  });
  return `${RESOURCE}?${query.toString()}`;
}

/** A station of the bundled index: its name, its place and its state as data.gov.in writes them. */
export type IndexedStation = readonly [name: string, lat: number, lon: number, state: string];

/** The states holding the given number of indexed stations nearest a point, nearest first. */
export function statesNear(index: readonly IndexedStation[], location: Location, count: number): string[] {
  const nearest = index
    .map(([, lat, lon, state]) => ({ state, km: distanceKm(location, { lat, lon }) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
  return [...new Set(nearest.map((entry) => entry.state))];
}

// Ties of the rounded averages go to the first in this order. It matched CPCB's predominant pollutant at every
// station of the 24 Nov 2026 feed; CPCB breaks some ties on unrounded values, so a tie can still differ.
const RULE_ORDER: readonly PollutantId[] = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];

/** CPCB's rule: the highest average sub-index, from at least three averages including PM2.5 or PM10, or null. */
export function aqiByCpcbRule(
  pollutants: readonly StationPollutant[],
): { readonly value: number; readonly predominant: PollutantId } | null {
  const averages = RULE_ORDER.flatMap((id) => {
    const avg = pollutants.find((row) => row.pollutant === id)?.avg;
    return avg === null || avg === undefined ? [] : [{ id, avg }];
  });
  if (averages.length < 3 || !averages.some((entry) => entry.id === 'pm25' || entry.id === 'pm10')) {
    return null;
  }
  const worst = averages.reduce((top, entry) => (entry.avg > top.avg ? entry : top));
  return { value: Math.round(worst.avg), predominant: worst.id };
}

const hourOf = (row: Row): string => cpcbStampToIso(row.last_update) ?? '';
const place = (text: string): string => text.replaceAll('_', ' ');

function groups(rows: readonly Row[]): { head: Row; rows: Row[] }[] {
  const byStation = new Map<string, { head: Row; rows: Row[] }>();
  for (const row of rows) {
    const group = byStation.get(row.station) ?? { head: row, rows: [] };
    group.rows.push(row);
    group.head = hourOf(row) > hourOf(group.head) ? row : group.head;
    byStation.set(row.station, group);
  }
  return [...byStation.values()];
}

// Only the rows of a station's latest hour are kept, so its values never mix two hours.
function toRecord({ head, rows }: { head: Row; rows: Row[] }): StationRecord[] {
  const latest = rows.filter((row) => hourOf(row) === hourOf(head));
  const node = {
    id: head.station,
    lastupdate: head.last_update,
    latitude: head.latitude,
    longitude: head.longitude,
    Pollutant_Index: latest.map((row) => ({
      id: row.pollutant_id,
      Min: row.min_value,
      Max: row.max_value,
      Avg: row.avg_value,
    })),
  };
  return stationRecord(place(head.state), place(head.city), node).map((record) => {
    const aqi = aqiByCpcbRule(record.pollutants);
    return { ...record, aqiValue: aqi?.value ?? null, predominant: aqi?.predominant ?? null };
  });
}

/** Builds a feed from rows of the resource. Rows that fail their check are skipped. */
export function dataGovFeed(records: readonly unknown[]): Result<StationFeed, 'no_stations'> {
  const rows = records.flatMap((raw) => {
    const row = rowSchema.safeParse(raw);
    return row.success ? [row.data] : [];
  });
  return stationFeedOf('data_gov_in', groups(rows).flatMap(toRecord));
}
