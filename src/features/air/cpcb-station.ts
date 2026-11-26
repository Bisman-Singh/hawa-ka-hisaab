// Reads one Station element of the CPCB feed into a checked record: values as published, NA and blanks as null.
// A station whose name, place, coordinates or hour fails its check gives no record; the rest of the feed stands.
import { z } from 'zod';
import type { PollutantId } from '../naqi/types.js';
import { stationRecordSchema } from './schemas.js';
import type { StationPollutant, StationRecord } from './types.js';

const CPCB_POLLUTANTS = new Map<string, PollutantId>([
  ['PM2.5', 'pm25'],
  ['PM10', 'pm10'],
  ['NO2', 'no2'],
  ['SO2', 'so2'],
  ['CO', 'co'],
  ['OZONE', 'o3'],
  ['NH3', 'nh3'],
]);

const value = z.string().optional();
const rowNode = z.object({ id: z.string(), Min: value, Max: value, Avg: value, Hourly_sub_index: value });
const aqiNode = z.object({ Value: value, Predominant_Parameter: value }).optional().catch(undefined);
const stationNode = z.object({
  id: z.string(),
  lastupdate: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  Pollutant_Index: z.array(z.unknown()).default([]),
  Air_Quality_Index: aqiNode,
});

const DECIMAL = /^\d+(\.\d+)?$/;
const STAMP = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2}:\d{2})$/;

const reading = (text: string | undefined): number | null => {
  const trimmed = text?.trim() ?? '';
  return DECIMAL.test(trimmed) ? Number(trimmed) : null;
};

const pollutantOf = (text: string | undefined): PollutantId | null =>
  CPCB_POLLUTANTS.get(text?.trim() ?? '') ?? null;

/** Turns a CPCB stamp such as 24-11-2026 22:00:00, which is IST, into an ISO timestamp with its offset. */
export function cpcbStampToIso(stamp: string): string | null {
  const trimmed = stamp.trim();
  return STAMP.test(trimmed) ? `${trimmed.replace(STAMP, '$3-$2-$1T$4')}+05:30` : null;
}

function pollutantRows(rows: readonly unknown[]): StationPollutant[] {
  const byId = new Map<PollutantId, StationPollutant>();
  for (const raw of rows) {
    const row = rowNode.safeParse(raw);
    const pollutant = row.success ? pollutantOf(row.data.id) : null;
    if (row.success && pollutant && !byId.has(pollutant)) {
      const { Hourly_sub_index, Avg, Min, Max } = row.data;
      byId.set(pollutant, {
        pollutant,
        hourlySubIndex: reading(Hourly_sub_index),
        avg: reading(Avg),
        min: reading(Min),
        max: reading(Max),
      });
    }
  }
  return [...byId.values()];
}

/** The record for one parsed Station element in a state and city, as a list of one, or empty when it fails. */
export function stationRecord(state: string, city: string, raw: unknown): StationRecord[] {
  const node = stationNode.safeParse(raw);
  if (!node.success) {
    return [];
  }
  const { id, lastupdate, latitude, longitude, Pollutant_Index, Air_Quality_Index } = node.data;
  const aqi = reading(Air_Quality_Index?.Value);
  const record = stationRecordSchema.safeParse({
    station: { name: id, city, state, lat: reading(latitude), lon: reading(longitude) },
    aqiValue: aqi,
    predominant: aqi === null ? null : pollutantOf(Air_Quality_Index?.Predominant_Parameter),
    pollutants: pollutantRows(Pollutant_Index),
    readingHour: cpcbStampToIso(lastupdate),
  });
  return record.success ? [record.data] : [];
}
