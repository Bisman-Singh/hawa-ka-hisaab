// Chooses the station for a point and builds the station path of the air card with CPCB's AQI as published.
import { FEED_STALE_AFTER_MINUTES, STATION_RADIUS_KM } from '../../config/limits.js';
import { CPCB_FEED, DATA_GOV_AQI } from '../../config/facts/air/sources.js';
import type { Source } from '../../lib/types.js';
import { bandForIndex, roundTo } from '../naqi/table.js';
import { distanceKm } from './geo.js';
import type { Location, StationFeed, StationProvider, StationReading, StationRecord } from './types.js';

/**
 * Tie-break rules, from what a reader needs. Among stations within 50 km with at least one value, the lowest
 * cost wins: distance, plus 10 km when CPCB published no AQI for it, plus 25 km when its hour is stale. So an
 * AQI beats a nearer station without one unless it is over 10 km farther, because without an AQI the card can
 * show only sub-indices; and a fresh hour beats a stale one unless it is over 25 km farther, because a reading
 * three hours old says little about now. Equal costs go to the nearer station, then to the name.
 */
export const CHOICE_PENALTY_KM: Readonly<Record<'noAqi' | 'stale', number>> = { noAqi: 10, stale: 25 };

/** A station with its distance from the point and the copy of the data it came from. */
export interface MeasuredStation {
  readonly record: StationRecord;
  readonly distanceKm: number;
  readonly provider: StationProvider;
}

/** The station chosen for a point, the distance to the nearest station of any kind, and whether any was in range. */
export interface StationChoice {
  readonly pick: MeasuredStation | null;
  readonly nearestKm: number | null;
  readonly anyInRange: boolean;
}

/** True when an hour is older than the stale limit at the given time. */
export function isStale(hourIso: string, nowMs: number): boolean {
  return nowMs - Date.parse(hourIso) > FEED_STALE_AFTER_MINUTES * 60_000;
}

const hasValue = (record: StationRecord): boolean =>
  record.pollutants.some((row) => row.hourlySubIndex !== null || row.avg !== null);

function cost(record: StationRecord, km: number, nowMs: number): number {
  const noAqi = record.aqiValue === null ? CHOICE_PENALTY_KM.noAqi : 0;
  return km + noAqi + (isStale(record.readingHour, nowMs) ? CHOICE_PENALTY_KM.stale : 0);
}

const measure = (location: Location, feed: StationFeed): MeasuredStation[] =>
  feed.stations.map((record) => ({
    record,
    distanceKm: distanceKm(location, record.station),
    provider: feed.provider,
  }));

/** Chooses the station for a point by the rules above. With no feed there is no choice to make. */
export function chooseStation(location: Location, feed: StationFeed | null, nowMs: number): StationChoice {
  const measured = (feed ? measure(location, feed) : []).sort(
    (a, b) => a.distanceKm - b.distanceKm || a.record.station.name.localeCompare(b.record.station.name),
  );
  const inRange = measured.filter((entry) => entry.distanceKm <= STATION_RADIUS_KM);
  const usable = inRange
    .filter((entry) => hasValue(entry.record))
    .map((entry) => ({ entry, cost: cost(entry.record, entry.distanceKm, nowMs) }));
  const best = usable.reduce<(typeof usable)[number] | null>(
    (top, next) => (top && top.cost <= next.cost ? top : next),
    null,
  );
  return {
    pick: best?.entry ?? null,
    nearestKm: measured[0] ? roundTo(measured[0].distanceKm, 1) : null,
    anyInRange: inRange.length > 0,
  };
}

const PROVIDER_SOURCES: Readonly<Record<StationProvider, Source>> = {
  cpcb_feed: CPCB_FEED,
  data_gov_in: DATA_GOV_AQI,
};

/**
 * The station path for a chosen station. The AQI is the record's: CPCB's own from the feed, never recomputed, or
 * on the data.gov.in copy the one CPCB's rule gives, as provider says.
 */
export function stationReading(pick: MeasuredStation, nowMs: number): StationReading {
  const { record, provider } = pick;
  const aqi = record.aqiValue;
  return {
    path: 'station',
    station: record.station,
    distanceKm: roundTo(pick.distanceKm, 1),
    aqi: aqi === null ? null : { value: aqi, band: bandForIndex(aqi), predominant: record.predominant },
    pollutants: record.pollutants,
    readingHour: record.readingHour,
    stale: isStale(record.readingHour, nowMs),
    source: PROVIDER_SOURCES[provider],
    provider,
  };
}
