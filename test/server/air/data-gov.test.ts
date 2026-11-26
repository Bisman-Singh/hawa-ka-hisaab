// Tests for the data.gov.in provider over a fake API shaped from the live answers of 26 Nov 2026: states near the
// point, the hourly cache, and answers caught while the resource is rebuilt in place.
import { describe, expect, it } from 'vitest';
import type { IndexedStation } from '../../../src/features/air/data-gov.js';
import { createDataGovProvider, DATA_GOV_RETRY_MS, STATION_INDEX } from '../../../src/server/air/data-gov.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';

const KEY = 'test-data-key';
const POLLUTANTS = ['PM2.5', 'PM10', 'NO2', 'NH3', 'SO2', 'CO', 'OZONE'];
const INDEX: IndexedStation[] = [
  ['A, Town - PCB', 20.01, 78, 'Alpha'],
  ['B, Town - PCB', 20.02, 78, 'Alpha'],
  ['C, Town - PCB', 20.03, 78, 'Alpha'],
  ['D, Town - PCB', 20.04, 78, 'Beta'],
  ['E, Town - PCB', 25, 78, 'Gamma'],
];

function stationRows(station: string, state: string, hour: string): Record<string, string>[] {
  return POLLUTANTS.map((pollutant_id, rank) => ({
    country: 'India',
    state,
    city: 'Town',
    station,
    last_update: hour,
    latitude: '20.01',
    longitude: '78',
    pollutant_id,
    min_value: '1',
    max_value: '300',
    avg_value: String(150 - rank),
  }));
}

/** Rows of every indexed station of a state, or only the first count of them. */
function stateRows(state: string, hour = '24-11-2026 22:00:00', count = 99): Record<string, string>[] {
  return INDEX.filter((entry) => entry[3] === state)
    .slice(0, count)
    .flatMap(([name]) => stationRows(name, state, hour));
}

/** A fake API answering filters[state] from a function the test can change. */
function fakeApi(answer: (state: string) => Record<string, string>[] = (state) => stateRows(state)) {
  return createFakeFetcher((url) => {
    const records = answer(new URL(url).searchParams.get('filters[state]') ?? '');
    return Promise.resolve(
      Response.json({ status: 'ok', total: records.length, count: records.length, records }),
    );
  });
}

const HERE = { lat: 20, lon: 78 };
const provider = (api: ReturnType<typeof fakeApi>, clock = createFakeClock()) =>
  createDataGovProvider({ fetcher: api.fetch, clock, apiKey: KEY, index: INDEX });
const asked = (api: ReturnType<typeof fakeApi>) =>
  api.calls.map((call) => new URL(call.url).searchParams.get('filters[state]'));

describe('createDataGovProvider', () => {
  it('reads only the states of the stations nearest the point and builds them with CPCB rule', async () => {
    const api = fakeApi();
    const read = await provider(api).readStations(HERE);
    expect(asked(api)).toEqual(['Alpha', 'Beta']);
    expect(read.kind === 'fresh' && read.feed.provider).toBe('data_gov_in');
    expect(read.kind === 'fresh' && read.feed.stations.map((record) => record.station.name)).toHaveLength(4);
    expect(read.kind === 'fresh' && read.feed.stations[0]).toMatchObject({
      aqiValue: 150,
      predominant: 'pm25',
    });
  });

  it('reads each state at most once an hour, shared between points', async () => {
    const clock = createFakeClock();
    const api = fakeApi();
    const stations = provider(api, clock);
    await stations.readStations(HERE);
    clock.advance(59 * 60_000);
    await stations.readStations({ lat: 20.005, lon: 78 });
    expect(api.calls).toHaveLength(2);
  });

  it('keeps the last good copy when a state comes back empty or shrunken mid rebuild, and asks again soon', async () => {
    const clock = createFakeClock();
    let answer = (state: string) => stateRows(state);
    const stations = provider(
      fakeApi((state) => answer(state)),
      clock,
    );
    await stations.readStations(HERE);
    clock.advance(60 * 60_000);
    answer = (state) => (state === 'Beta' ? [] : stateRows(state, '24-11-2026 23:00:00', 2));
    const during = await stations.readStations(HERE);
    expect(during.kind).toBe('last_good');
    expect(during.kind === 'last_good' && during.feed.feedHour).toBe('2026-11-24T22:00:00+05:30');
    answer = (state) => stateRows(state, '24-11-2026 23:00:00');
    clock.advance(DATA_GOV_RETRY_MS);
    const after = await stations.readStations(HERE);
    expect(after.kind === 'fresh' && after.feed.feedHour).toBe('2026-11-24T23:00:00+05:30');
  });

  it('refuses an older hour and a state under half its indexed stations, and takes a smaller one two hours on', async () => {
    const clock = createFakeClock();
    let answer = (state: string) => stateRows(state, '24-11-2026 22:00:00');
    const stations = provider(
      fakeApi((state) => answer(state)),
      clock,
    );
    expect((await stations.readStations(HERE)).kind).toBe('fresh');
    clock.advance(60 * 60_000);
    answer = (state) => stateRows(state, '24-11-2026 21:00:00');
    expect((await stations.readStations(HERE)).kind).toBe('last_good');
    clock.advance(60 * 60_000);
    answer = (state) => stateRows(state, '25-11-2026 00:00:00', 2);
    const later = await stations.readStations(HERE);
    expect(later.kind === 'fresh' && later.feed.stations).toHaveLength(3);
    const cold = provider(fakeApi((state) => stateRows(state, '24-11-2026 22:00:00', 1)));
    expect(await cold.readStations(HERE)).toMatchObject({ kind: 'last_good' });
  });

  it('reports a miss without the key when the API refuses, and reads nothing without a point', async () => {
    const denied = createFakeFetcher(() =>
      Promise.resolve(Response.json({ error: 'Key not authorised' }, { status: 403 })),
    );
    const read = await createDataGovProvider({
      fetcher: denied.fetch,
      clock: createFakeClock(),
      apiKey: KEY,
      index: INDEX,
    }).readStations(HERE);
    expect(read).toEqual({ kind: 'miss', failure: { kind: 'status', status: 403 } });
    expect(JSON.stringify(read)).not.toContain(KEY);
    expect(new URL(denied.calls[0]?.url ?? 'https://x').searchParams.get('api-key')).toBe(KEY);
    const api = fakeApi();
    expect(await provider(api).readStations()).toEqual({ kind: 'miss', failure: { kind: 'invalid_body' } });
    expect(api.calls).toHaveLength(0);
  });

  it('ships an index of the stations data.gov.in names, with their states, and uses it by default', async () => {
    expect(STATION_INDEX.length).toBeGreaterThan(500);
    expect(new Set(STATION_INDEX.map(([name]) => name)).size).toBe(STATION_INDEX.length);
    expect(new Set(STATION_INDEX.map((entry) => entry[3]))).toContain('Delhi');
    const api = fakeApi(() => []);
    await createDataGovProvider({ fetcher: api.fetch, clock: createFakeClock(), apiKey: KEY }).readStations({
      lat: 28.63,
      lon: 77.22,
    });
    expect(asked(api)).toEqual(['Delhi']);
  });
});
