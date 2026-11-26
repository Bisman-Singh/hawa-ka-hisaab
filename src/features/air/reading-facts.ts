// What a model may say about the air: a short summary of the reading and the fact values behind its numbers.
// Plan and ask requests carry both, so a sentence about the air can only repeat what the air card shows.
import type { FactValue } from '../../lib/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { AirReading, ModelledReading, StationReading } from './types.js';

/** The reading in brief, as sent to the model. time is the IST clock hour of the reading or model hour. */
export interface AirSummary {
  readonly path: AirReading['path'];
  readonly band: AqiBand | null;
  readonly aqi: number | null;
  readonly station: string | null;
  readonly distanceKm: number | null;
  readonly time: string | null;
  readonly stale: boolean;
}

/** The AQI band of a reading: the station's published band or the computed estimate's, else null. */
export function readingBand(reading: AirReading): AqiBand | null {
  if (reading.path === 'station') {
    return reading.aqi?.band ?? null;
  }
  return reading.path === 'modelled' && reading.estimate.status === 'computed' ? reading.estimate.band : null;
}

const oneDecimal = (value: number | null): number | null =>
  value === null ? null : Math.round(value * 10) / 10;

const stationSummary = (reading: StationReading): AirSummary => ({
  path: 'station',
  band: readingBand(reading),
  aqi: reading.aqi?.value ?? null,
  station: reading.station.name,
  distanceKm: oneDecimal(reading.distanceKm),
  time: reading.readingHour.slice(11, 16),
  stale: reading.stale,
});

const modelledSummary = (reading: ModelledReading): AirSummary => ({
  path: 'modelled',
  band: readingBand(reading),
  aqi: reading.estimate.status === 'computed' ? reading.estimate.value : null,
  station: null,
  distanceKm: oneDecimal(reading.nearestStationKm),
  time: reading.modelHour.slice(11, 16),
  stale: false,
});

const NONE: AirSummary = {
  path: 'unavailable',
  band: null,
  aqi: null,
  station: null,
  distanceKm: null,
  time: null,
  stale: false,
};

function summaryOf(reading: AirReading): AirSummary {
  if (reading.path === 'station') {
    return stationSummary(reading);
  }
  return reading.path === 'modelled' ? modelledSummary(reading) : NONE;
}

type Row = readonly [id: string, label: string, value: number | null, unit: string];

function factsOf(summary: AirSummary): FactValue[] {
  const aqiLabel = summary.path === 'station' ? 'CPCB AQI at the station' : 'Modelled AQI estimate';
  const time = summary.time ?? '';
  const rows: Row[] = [
    ['air-aqi', aqiLabel, summary.aqi, 'AQI'],
    ['air-reading-time', 'Hour of the reading, hour', time === '' ? null : Number(time.slice(0, 2)), 'hour'],
    [
      'air-reading-time',
      'Hour of the reading, minute',
      time === '' ? null : Number(time.slice(3, 5)),
      'minute',
    ],
    [
      'air-station-distance',
      `Distance to the ${summary.station === null ? 'nearest ' : ''}station`,
      summary.distanceKm,
      'km',
    ],
    ...[...(summary.station ?? '').matchAll(/\d+/g)].map(([raw]): Row => [
      'air-station-name',
      'Number in the station name',
      Number(raw),
      'name',
    ]),
  ];
  return rows.flatMap(([id, label, value, unit]) => (value === null ? [] : [{ id, label, value, unit }]));
}

/** The summary of a reading for the model and the fact values for every number in it. */
export function airFacts(reading: AirReading): { readonly summary: AirSummary; readonly facts: FactValue[] } {
  const summary = summaryOf(reading);
  return { summary, facts: factsOf(summary) };
}
