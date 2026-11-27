// The data.gov.in copy of the CPCB data: one row per station and pollutant, with no AQI. Rows are grouped into
// the same station records the feed gives, and the AQI is the one CPCB's rule gives from the averages.
import { z } from 'zod';
import { pollutantIdSchema } from '../naqi/schemas.js';
import type { PollutantId } from '../naqi/types.js';
import { cpcbStampToIso, stationRecord } from './cpcb-station.js';
import { distanceKm } from './geo.js';
import type { Location, StationPollutant, StationRecord } from './types.js';

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

/**
 * Rows a station has at one hour when its answer is whole. Both copies of CPCB's data list every station with all
 * seven pollutants, NA where not measured: 567 of 567 stations on data.gov.in on 26 Nov 2026 and 575 of 575 in the
 * feed. Fewer means the answer came mid rebuild, and the missing pollutant may be the worst one.
 */
export const COMPLETE_ROWS = pollutantIdSchema.options.length;

interface Group<T> {
  readonly key: string;
  readonly head: T;
  readonly all: T[];
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Group<T>[] {
  const groups = new Map<string, Group<T>>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key) ?? { key, head: item, all: [] };
    group.all.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

// The record of one station at one hour with CPCB's rule applied, when all seven pollutants are there.
function completeRecord({ head, all }: Group<Row>): StationRecord | null {
  const node = {
    id: head.station,
    lastupdate: head.last_update,
    latitude: head.latitude,
    longitude: head.longitude,
    Pollutant_Index: all.map((row) => ({
      id: row.pollutant_id,
      Min: row.min_value,
      Max: row.max_value,
      Avg: row.avg_value,
    })),
  };
  const [record] = stationRecord(place(head.state), place(head.city), node);
  if (record?.pollutants.length !== COMPLETE_ROWS) {
    return null;
  }
  const aqi = aqiByCpcbRule(record.pollutants);
  return { ...record, aqiValue: aqi?.value ?? null, predominant: aqi?.predominant ?? null };
}

// A station's newest hour with all its rows, so values never mix two hours, and whether that is its newest hour.
function stationReading({ all }: Group<Row>): { record: StationRecord | null; whole: boolean } {
  const hours = groupBy(all, hourOf).sort((a, b) => b.key.localeCompare(a.key));
  const records = hours.map(completeRecord);
  const index = records.findIndex((record) => record !== null);
  return { record: records[index] ?? null, whole: index === 0 };
}

/** Stations read from rows of the resource: those complete at one hour, and how many lack rows at their newest. */
export interface DataGovStations {
  readonly complete: readonly StationRecord[];
  readonly incomplete: number;
}

/** Reads rows of the resource into stations. Rows that fail their check are skipped. */
export function dataGovStations(records: readonly unknown[]): DataGovStations {
  const rows = records.flatMap((raw) => {
    const row = rowSchema.safeParse(raw);
    return row.success ? [row.data] : [];
  });
  const stations = groupBy(rows, (row) => row.station).map(stationReading);
  return {
    complete: stations.flatMap((station) => (station.record ? [station.record] : [])),
    incomplete: stations.filter((station) => !station.whole).length,
  };
}
