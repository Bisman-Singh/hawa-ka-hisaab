// Tests for the station choice: the 50 km radius, the tie-break rules for blank AQI and stale hours, and ties.
import { describe, expect, it } from 'vitest';
import {
  CHOICE_PENALTY_KM,
  chooseStation,
  isStale,
  stationReading,
} from '../../../src/features/air/stations.js';
import type { StationRecord } from '../../../src/features/air/types.js';
import { jnuStation, stationFeed } from '../../support/fake-air.js';
import { FIXTURE_HOUR_MS } from '../../support/fake-clock.js';

const HERE = { lat: 20, lon: 78 };
const KM_PER_DEGREE = 111.19508;
const NOW = FIXTURE_HOUR_MS + 30 * 60_000;

function stationAt(name: string, km: number, overrides: Partial<StationRecord> = {}): StationRecord {
  const base = jnuStation();
  return {
    ...base,
    station: { ...base.station, name, lat: HERE.lat + km / KM_PER_DEGREE, lon: HERE.lon },
    ...overrides,
  };
}

const picked = (records: readonly StationRecord[]): string | null =>
  chooseStation(HERE, stationFeed(records), NOW).pick?.record.station.name ?? null;

const STALE_HOUR = '2026-11-24T18:00:00+05:30';

describe('chooseStation', () => {
  it('keeps to the 50 km radius and reports the nearest station of any kind', () => {
    expect(picked([stationAt('in', 49.9)])).toBe('in');
    const outside = chooseStation(HERE, stationFeed([stationAt('out', 50.1)]), NOW);
    expect(outside).toEqual({ pick: null, nearestKm: 50.1, anyInRange: false });
    expect(chooseStation(HERE, stationFeed([]), NOW)).toEqual({
      pick: null,
      nearestKm: null,
      anyInRange: false,
    });
    expect(chooseStation(HERE, null, NOW)).toEqual({ pick: null, nearestKm: null, anyInRange: false });
  });

  it('skips a station in range that has no value at all, and says one was in range', () => {
    const empty = stationAt('empty', 2, {
      aqiValue: null,
      pollutants: [{ pollutant: 'pm25', hourlySubIndex: null, avg: null, min: 10, max: 20 }],
    });
    expect(chooseStation(HERE, stationFeed([empty]), NOW)).toMatchObject({
      pick: null,
      anyInRange: true,
      nearestKm: 2,
    });
    expect(picked([empty, stationAt('far', 30)])).toBe('far');
  });

  it('prefers a station with an AQI unless it is more than 10 km farther than one without', () => {
    const blank = stationAt('blank', 2, { aqiValue: null, predominant: null });
    expect(picked([blank, stationAt('aqi', 2 + CHOICE_PENALTY_KM.noAqi - 0.5)])).toBe('aqi');
    expect(picked([blank, stationAt('aqi', 2 + CHOICE_PENALTY_KM.noAqi + 0.5)])).toBe('blank');
  });

  it('prefers a fresh hour unless it is more than 25 km farther than a stale one', () => {
    const stale = stationAt('stale', 1, { readingHour: STALE_HOUR });
    expect(picked([stale, stationAt('fresh', 1 + CHOICE_PENALTY_KM.stale - 1)])).toBe('fresh');
    expect(picked([stale, stationAt('fresh', 1 + CHOICE_PENALTY_KM.stale + 1)])).toBe('stale');
  });

  it('gives equal costs to the nearer station, then to the name', () => {
    const blankNear = stationAt('blank near', 3, { aqiValue: null });
    expect(picked([stationAt('b', 5), stationAt('a', 5)])).toBe('a');
    expect(picked([stationAt('aqi at 13', 13), blankNear])).toBe('blank near');
  });
});

describe('isStale and stationReading', () => {
  it('calls an hour stale only when it is more than three hours old', () => {
    expect(isStale('2026-11-24T22:00:00+05:30', FIXTURE_HOUR_MS + 180 * 60_000)).toBe(false);
    expect(isStale('2026-11-24T22:00:00+05:30', FIXTURE_HOUR_MS + 181 * 60_000)).toBe(true);
  });

  it('rounds the distance to a tenth of a kilometre and credits CPCB', () => {
    const reading = stationReading({ record: jnuStation(), distanceKm: 3.27, provider: 'cpcb_feed' }, NOW);
    expect(reading.distanceKm).toBe(3.3);
    expect(reading.source.publisher).toBe('Central Pollution Control Board');
    expect(reading.provider).toBe('cpcb_feed');
    expect(reading.aqi).toEqual({ value: 246, band: 'poor', predominant: 'pm25' });
  });

  it('says when the data.gov.in copy served the reading and cites it', () => {
    const reading = stationReading({ record: jnuStation(), distanceKm: 1, provider: 'data_gov_in' }, NOW);
    expect(reading.provider).toBe('data_gov_in');
    expect(reading.source.url).toBe(
      'https://www.data.gov.in/resource/real-time-air-quality-index-various-locations',
    );
  });
});
