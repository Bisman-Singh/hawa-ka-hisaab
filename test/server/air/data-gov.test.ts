// Tests for the data.gov.in provider over a fake API shaped from the live answers of 26 and 27 Nov 2026: states near
// the point, the hourly cache, answers caught while the resource is rebuilt in place, and the retry policy.
import { describe, expect, it } from 'vitest';
import { COPY_TTL_MS } from '../../../src/features/air/state-copy.js';
import { createDataGovProvider, STATION_INDEX } from '../../../src/server/air/data-gov.js';
import { createFakeClock, type FakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';
import {
  asked,
  fakeDataGovApi as fakeApi,
  HOUR_22,
  HOUR_23,
  INDEX,
  KEY,
  stateRows,
  stationRows,
  type Answer,
  type Row,
} from '../../support/fake-data-gov.js';

const HERE = { lat: 20, lon: 78 };
const noWait = () => Promise.resolve();
const provider = (api: ReturnType<typeof fakeApi>, clock: FakeClock = createFakeClock()) =>
  createDataGovProvider({ fetcher: api.fetch, clock, apiKey: KEY, index: INDEX, wait: noWait });
const names = (read: Awaited<ReturnType<ReturnType<typeof provider>['readStations']>>) =>
  read.kind === 'miss' ? [] : read.feed.stations.map((record) => [record.station.name, record.readingHour]);

describe('createDataGovProvider', () => {
  it('reads only the states of the stations nearest the point and builds them with CPCB rule', async () => {
    const api = fakeApi();
    const read = await provider(api).readStations(HERE);
    expect(asked(api)).toEqual(['Alpha', 'Beta']);
    expect(read.kind === 'fresh' && read.feed.provider).toBe('data_gov_in');
    expect(names(read)).toHaveLength(4);
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

  it('reads a whole copy an hour behind again after ten minutes, as the next hour is due', async () => {
    const clock = createFakeClock();
    clock.advance(70 * 60_000);
    const api = fakeApi();
    const stations = provider(api, clock);
    await stations.readStations(HERE);
    clock.advance(COPY_TTL_MS.behind - 1);
    await stations.readStations(HERE);
    expect(api.calls).toHaveLength(2);
    clock.advance(1);
    await stations.readStations(HERE);
    expect(api.calls).toHaveLength(4);
  });

  it('never gives an AQI to a station whose rows are not all there, so a missing worst pollutant cannot lower it', async () => {
    const api = fakeApi((state) =>
      state === 'Alpha'
        ? [
            ...stationRows('A, Town - PCB', HOUR_22, (id) => id !== 'PM2.5'),
            ...stationRows('B, Town - PCB', HOUR_22),
            ...stationRows('C, Town - PCB', HOUR_22),
          ]
        : stateRows(state),
    );
    const read = await provider(api).readStations(HERE);
    expect(names(read).map(([name]) => name)).toEqual(['B, Town - PCB', 'C, Town - PCB', 'D, Town - PCB']);
    expect(read).toMatchObject({ kind: 'last_good', failure: { kind: 'incomplete' } });
  });

  it('on a cold instance mid rebuild serves the stations that are complete, and asks again soon', async () => {
    const clock = createFakeClock();
    let answer: Answer = (state) =>
      state === 'Alpha'
        ? [
            ...stationRows('A, Town - PCB', HOUR_22),
            ...stationRows('B, Town - PCB', HOUR_22, (id) => id !== 'CO'),
          ]
        : [];
    const api = fakeApi((state) => answer(state));
    const stations = provider(api, clock);
    const during = await stations.readStations(HERE);
    expect(names(during)).toEqual([['A, Town - PCB', '2026-11-24T22:00:00+05:30']]);
    expect(during).toMatchObject({ kind: 'last_good', failure: { kind: 'incomplete' } });
    answer = (state) => stateRows(state);
    clock.advance(COPY_TTL_MS.partial - 1);
    await stations.readStations(HERE);
    const before = api.calls.length;
    clock.advance(1);
    expect((await stations.readStations(HERE)).kind).toBe('fresh');
    expect(api.calls.length).toBeGreaterThan(before);
  });

  it('asks once more at once when an answer is empty or a gateway fails, but not after a 429 or a timeout', async () => {
    const answers: (Row[] | Response)[] = [[], stateRows('Beta')];
    const api = fakeApi((state) => (state === 'Beta' ? (answers.shift() ?? []) : stateRows(state)));
    expect((await provider(api).readStations(HERE)).kind).toBe('fresh');
    expect(asked(api).filter((state) => state === 'Beta')).toHaveLength(2);
    const gateway = fakeApi((state) =>
      state === 'Alpha' ? new Response('bad gateway', { status: 502 }) : [],
    );
    await provider(gateway).readStations(HERE);
    expect(asked(gateway).sort()).toEqual(['Alpha', 'Alpha', 'Beta', 'Beta']);
    const busy = fakeApi(() => new Response('slow down', { status: 429 }));
    expect(await provider(busy).readStations(HERE)).toEqual({
      kind: 'miss',
      failure: { kind: 'status', status: 429 },
    });
    expect(busy.calls).toHaveLength(2);
  });

  it('keeps the first answer when the second attempt fails', async () => {
    const partial = [
      ...stationRows('A, Town - PCB', HOUR_22),
      ...stationRows('B, Town - PCB', HOUR_22).slice(1),
    ];
    const answers: (Row[] | Response)[] = [partial, new Response('', { status: 429 })];
    const api = fakeApi((state) => (state === 'Alpha' ? (answers.shift() ?? []) : stateRows(state)));
    const read = await provider(api).readStations(HERE);
    expect(read).toMatchObject({ kind: 'last_good', failure: { kind: 'incomplete' } });
    expect(names(read).map(([name]) => name)).toEqual(['A, Town - PCB', 'D, Town - PCB']);
  });

  it('makes no second attempt when too little of the time for one call is left', async () => {
    const clock = createFakeClock();
    const api = createFakeFetcher((_url, init) => {
      clock.advance(6500);
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(Response.json({ total: 0, records: [] }));
    });
    const read = await createDataGovProvider({
      fetcher: api.fetch,
      clock,
      apiKey: KEY,
      index: [['E, Town - PCB', 25, 78, 'Gamma']],
      wait: noWait,
    }).readStations({ lat: 25, lon: 78 });
    expect(read).toEqual({ kind: 'miss', failure: { kind: 'incomplete' } });
    expect(api.calls).toHaveLength(1);
  });

  it('keeps serving its whole copy while a newer answer comes with rows missing', async () => {
    const clock = createFakeClock();
    let answer: Answer = (state) => stateRows(state);
    const stations = provider(
      fakeApi((state) => answer(state)),
      clock,
    );
    await stations.readStations(HERE);
    clock.advance(60 * 60_000);
    answer = (state) =>
      state === 'Alpha'
        ? [...stateRows(state, HOUR_23, 2), ...stationRows('C, Town - PCB', HOUR_23, (id) => id === 'NO2')]
        : stateRows(state, HOUR_23);
    const read = await stations.readStations(HERE);
    expect(read).toMatchObject({ kind: 'last_good', failure: { kind: 'incomplete' } });
    expect(names(read)).toEqual([
      ['A, Town - PCB', '2026-11-24T22:00:00+05:30'],
      ['B, Town - PCB', '2026-11-24T22:00:00+05:30'],
      ['C, Town - PCB', '2026-11-24T22:00:00+05:30'],
      ['D, Town - PCB', '2026-11-24T23:00:00+05:30'],
    ]);
  });

  it('refuses an older hour, and takes a whole answer that lacks a station', async () => {
    const clock = createFakeClock();
    let answer: Answer = (state) => stateRows(state, HOUR_22);
    const stations = provider(
      fakeApi((state) => answer(state)),
      clock,
    );
    expect((await stations.readStations(HERE)).kind).toBe('fresh');
    clock.advance(60 * 60_000);
    answer = (state) => stateRows(state, '24-11-2026 21:00:00');
    expect(await stations.readStations(HERE)).toMatchObject({
      kind: 'last_good',
      failure: { kind: 'incomplete' },
    });
    clock.advance(60 * 60_000);
    answer = (state) => stateRows(state, '25-11-2026 00:00:00', 2);
    const later = await stations.readStations(HERE);
    expect(later.kind).toBe('fresh');
    expect(names(later).map(([name]) => name)).toEqual(['A, Town - PCB', 'B, Town - PCB', 'D, Town - PCB']);
    const cold = provider(fakeApi((state) => stateRows(state, HOUR_22, 1)));
    expect(await cold.readStations(HERE)).toMatchObject({
      kind: 'last_good',
      failure: { kind: 'incomplete' },
    });
  });

  it('waits twenty seconds before asking a state again after an answer caught mid rebuild', async () => {
    const clock = createFakeClock();
    const api = fakeApi(() => []);
    const stations = provider(api, clock);
    await stations.readStations(HERE);
    const first = api.calls.length;
    clock.advance(19_999);
    await stations.readStations(HERE);
    expect(api.calls).toHaveLength(first);
    clock.advance(1);
    await stations.readStations(HERE);
    expect(api.calls.length).toBeGreaterThan(first);
  });

  it('makes no call over its budget and does not hold that against the next reader', async () => {
    let allowed = false;
    const api = fakeApi();
    const stations = createDataGovProvider({
      fetcher: api.fetch,
      clock: createFakeClock(),
      apiKey: KEY,
      index: INDEX,
      wait: noWait,
      budget: { allow: () => Promise.resolve(allowed) },
    });
    expect(await stations.readStations(HERE)).toEqual({ kind: 'miss', failure: { kind: 'over_budget' } });
    expect(api.calls).toHaveLength(0);
    allowed = true;
    expect((await stations.readStations(HERE)).kind).toBe('fresh');
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
    await createDataGovProvider({
      fetcher: api.fetch,
      clock: createFakeClock(),
      apiKey: KEY,
      wait: noWait,
    }).readStations({ lat: 28.63, lon: 77.22 });
    expect(asked(api)).toEqual(['Delhi', 'Delhi']);
  });
});
