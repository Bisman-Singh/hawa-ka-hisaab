// Tests for the data.gov.in path: CPCB's AQI rule pinned against the saved feed, and rows grouped into stations,
// with only stations whose seven rows are all there at one hour taken.
import { describe, expect, it } from 'vitest';
import { parseCpcbFeed } from '../../../src/features/air/cpcb-feed.js';
import {
  aqiByCpcbRule,
  COMPLETE_ROWS,
  dataGovStations,
  dataGovStateUrl,
  statesNear,
} from '../../../src/features/air/data-gov.js';
import type { IndexedStation } from '../../../src/features/air/data-gov.js';
import type { StationRecord } from '../../../src/features/air/types.js';
import { readCpcbSnapshotParts } from '../../support/cpcb-snapshot.js';
import { readCpcbFixture } from '../../support/fixtures.js';

function stationsOf(text: string): StationRecord[] {
  const feed = parseCpcbFeed(text);
  return feed.ok ? [...feed.value.stations] : [];
}

function ruleAgreement(stations: readonly StationRecord[]): {
  published: number;
  agree: number;
  blankNull: number;
} {
  const published = stations.filter((record) => record.aqiValue !== null);
  const agree = published.filter((record) => {
    const rule = aqiByCpcbRule(record.pollutants);
    return rule?.value === record.aqiValue && rule.predominant === record.predominant;
  });
  const blank = stations.filter((record) => record.aqiValue === null);
  return {
    published: published.length,
    agree: agree.length,
    blankNull: blank.filter((record) => aqiByCpcbRule(record.pollutants) === null).length,
  };
}

const CPCB_NAMES: Readonly<Record<string, string>> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO2',
  so2: 'SO2',
  co: 'CO',
  o3: 'OZONE',
  nh3: 'NH3',
};

const na = (value: number | null): string => (value === null ? 'NA' : String(value));

/** The records of a feed written out as data.gov.in rows, one per station and pollutant. */
function asRows(stations: readonly StationRecord[]): Record<string, string>[] {
  return stations.flatMap((record) =>
    record.pollutants.map((row) => ({
      country: 'India',
      state: record.station.state.replaceAll(' ', '_'),
      city: record.station.city,
      station: record.station.name,
      last_update: '24-11-2026 22:00:00',
      latitude: String(record.station.lat),
      longitude: String(record.station.lon),
      pollutant_id: CPCB_NAMES[row.pollutant] ?? '',
      min_value: na(row.min),
      max_value: na(row.max),
      avg_value: na(row.avg),
    })),
  );
}

describe("CPCB's AQI rule against what CPCB published", () => {
  it('gives the published AQI and predominant pollutant at every fixture station that has one', () => {
    expect(ruleAgreement(stationsOf(readCpcbFixture()))).toEqual({ published: 5, agree: 5, blankNull: 2 });
  });

  it('gives the published AQI at 546 of 546 stations of the whole saved feed, and null at the 29 blank ones', () => {
    const stations = readCpcbSnapshotParts().flatMap(stationsOf);
    expect(stations).toHaveLength(575);
    expect(ruleAgreement(stations)).toEqual({ published: 546, agree: 546, blankNull: 29 });
  });

  it('needs three averages, one of them PM2.5 or PM10', () => {
    const row = (pollutant: 'pm25' | 'no2' | 'so2' | 'o3', avg: number | null) => ({
      pollutant,
      hourlySubIndex: null,
      avg,
      min: null,
      max: null,
    });
    expect(aqiByCpcbRule([row('pm25', 90), row('no2', 20)])).toBeNull();
    expect(aqiByCpcbRule([row('no2', 90), row('so2', 20), row('o3', 30)])).toBeNull();
    expect(aqiByCpcbRule([row('pm25', 90), row('no2', 20), row('so2', null)])).toBeNull();
    expect(aqiByCpcbRule([row('pm25', 90.6), row('no2', 120), row('so2', 3)])).toEqual({
      value: 120,
      predominant: 'no2',
    });
  });
});

describe('dataGovStations', () => {
  it('turns the fixture written as rows back into the same stations and AQIs', () => {
    const direct = stationsOf(readCpcbFixture());
    const { complete, incomplete } = dataGovStations(asRows(direct));
    expect(incomplete).toBe(0);
    expect(complete.map((record) => record.aqiValue)).toEqual(direct.map((record) => record.aqiValue));
    expect(complete.map((record) => record.station)).toEqual(direct.map((record) => record.station));
    expect(complete[0]?.pollutants[0]).toEqual({
      pollutant: 'pm25',
      hourlySubIndex: null,
      avg: 246,
      min: 89,
      max: 321,
    });
  });

  it('expects all seven pollutants, as every station of both saved copies has', () => {
    expect(COMPLETE_ROWS).toBe(7);
    const direct = readCpcbSnapshotParts().flatMap(stationsOf);
    expect(direct.every((record) => record.pollutants.length === COMPLETE_ROWS)).toBe(true);
  });

  const base = {
    country: 'India',
    state: 'Tamil_Nadu',
    city: 'Chennai',
    station: 'Perungudi, Chennai - TNPCB',
    last_update: '24-11-2026 22:00:00',
    latitude: '12.9533',
    longitude: '80.2357',
  };
  const row = (pollutant_id: string, avg: string | number, extra: Record<string, string> = {}) => ({
    ...base,
    pollutant_id,
    min_value: 'NA',
    max_value: 'NA',
    avg_value: avg,
    ...extra,
  });
  const rest = (extra: Record<string, string> = {}) =>
    ['PM10', 'NH3', 'OZONE'].map((id) => row(id, 'NA', extra));

  it('keeps the first of duplicated rows, reads numbers sent as numbers, and reads NA as null', () => {
    const rows = [
      row('PM2.5', '60'),
      row('PM2.5', '99'),
      { ...base, pollutant_id: 'NO2', min_value: '1', max_value: '9', avg_value: 5 },
      row('SO2', 'NA'),
      row('CO', '30'),
      ...rest(),
    ];
    const [record] = dataGovStations(rows).complete;
    expect(record?.station.state).toBe('Tamil Nadu');
    expect(record?.pollutants.map((entry) => [entry.pollutant, entry.avg])).toEqual([
      ['pm25', 60],
      ['no2', 5],
      ['so2', null],
      ['co', 30],
      ['pm10', null],
      ['nh3', null],
      ['o3', null],
    ]);
    expect(record).toMatchObject({
      aqiValue: 60,
      predominant: 'pm25',
      readingHour: '2026-11-24T22:00:00+05:30',
    });
  });

  it('never takes a station with a row missing, so a missing worst pollutant cannot lower its AQI', () => {
    const rows = [row('PM2.5', '300'), row('NO2', '20'), row('SO2', '10'), row('CO', '30'), ...rest()];
    expect(dataGovStations(rows).complete[0]?.aqiValue).toBe(300);
    expect(dataGovStations(rows.slice(1))).toEqual({ complete: [], incomplete: 1 });
    const twice = [...rows.slice(1), row('NO2', '20')];
    expect(dataGovStations(twice)).toEqual({ complete: [], incomplete: 1 });
  });

  it('takes the newest hour whose rows are all there and counts a station whose newest hour is short', () => {
    const at21 = { last_update: '24-11-2026 21:00:00' };
    const rows = [
      ...[row('PM2.5', '40', at21), row('NO2', '20', at21), row('SO2', '10', at21), row('CO', '30', at21)],
      ...rest(at21),
      row('PM2.5', '90'),
      row('NO2', '20'),
    ];
    const { complete, incomplete } = dataGovStations(rows);
    expect(incomplete).toBe(1);
    expect(complete[0]).toMatchObject({ aqiValue: 40, readingHour: '2026-11-24T21:00:00+05:30' });
  });

  it('gives a null AQI to a complete station whose averages are too few for CPCB rule', () => {
    const rows = [row('PM2.5', '60'), row('NO2', '20'), row('SO2', 'NA'), row('CO', 'NA'), ...rest()];
    expect(dataGovStations(rows).complete[0]).toMatchObject({ aqiValue: null, predominant: null });
  });

  it('skips rows of the wrong shape, rows whose hour it cannot read and stations that fail their check', () => {
    const noCoordinates = { ...row('PM2.5', '60'), station: 'Other', latitude: undefined };
    expect(dataGovStations([{ station: 'x' }, noCoordinates])).toEqual({ complete: [], incomplete: 1 });
    expect(dataGovStations([])).toEqual({ complete: [], incomplete: 0 });
    const soon = [
      row('PM2.5', '60', { last_update: 'soon' }),
      row('NO2', '20'),
      row('SO2', '1'),
      row('CO', '1'),
    ];
    expect(dataGovStations([...soon, ...rest()])).toEqual({ complete: [], incomplete: 1 });
  });
});

describe('dataGovStateUrl and statesNear', () => {
  it('asks for one state by its exact name and sends the key as the api-key parameter', () => {
    const url = new URL(dataGovStateUrl('test-key', 'Uttar Pradesh'));
    expect(url.origin + url.pathname).toBe(
      'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      'api-key': 'test-key',
      format: 'json',
      limit: '1500',
      'filters[state]': 'Uttar Pradesh',
    });
  });

  it('names the states of the indexed stations nearest a point, nearest first, once each', () => {
    const index: IndexedStation[] = [
      ['far', 30, 78, 'Punjab'],
      ['near', 20.01, 78, 'Maharashtra'],
      ['middle', 20.2, 78, 'Telangana'],
      ['close', 20.05, 78, 'Maharashtra'],
    ];
    expect(statesNear(index, { lat: 20, lon: 78 }, 3)).toEqual(['Maharashtra', 'Telangana']);
    expect(statesNear([], { lat: 20, lon: 78 }, 2)).toEqual([]);
  });
});
