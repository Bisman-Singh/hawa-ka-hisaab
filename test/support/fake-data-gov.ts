// A fake data.gov.in resource shaped from the live answers of 26 and 27 Nov 2026: five indexed stations in three
// states, every station with its seven pollutant rows, and an answer per state the test can change.
import type { IndexedStation } from '../../src/features/air/data-gov.js';
import { createFakeFetcher, type FakeFetcher } from './fake-fetch.js';

/** The key the fakes are built with. */
export const KEY = 'test-data-key';

const POLLUTANTS = ['PM2.5', 'PM10', 'NO2', 'NH3', 'SO2', 'CO', 'OZONE'];

/** The index: three stations in Alpha and one in Beta near 20, 78, and one in Gamma far north. */
export const INDEX: IndexedStation[] = [
  ['A, Town - PCB', 20.01, 78, 'Alpha'],
  ['B, Town - PCB', 20.02, 78, 'Alpha'],
  ['C, Town - PCB', 20.03, 78, 'Alpha'],
  ['D, Town - PCB', 20.04, 78, 'Beta'],
  ['E, Town - PCB', 25, 78, 'Gamma'],
];

/** A feed hour as the resource writes it. */
export const HOUR_22 = '24-11-2026 22:00:00';

/** The hour after HOUR_22. */
export const HOUR_23 = '24-11-2026 23:00:00';

/** One row of the resource. */
export type Row = Record<string, string>;

/** The seven rows of a station, PM2.5 the worst, or only those whose pollutant passes keep. */
export function stationRows(
  station: string,
  hour: string,
  keep: (id: string) => boolean = () => true,
): Row[] {
  const [, lat = 20, lon = 78, state = 'Alpha'] = INDEX.find((entry) => entry[0] === station) ?? [];
  return POLLUTANTS.filter(keep).map((pollutant_id, rank) => ({
    country: 'India',
    state,
    city: 'Town',
    station,
    last_update: hour,
    latitude: String(lat),
    longitude: String(lon),
    pollutant_id,
    min_value: '1',
    max_value: '300',
    avg_value: String(150 - rank * 10),
  }));
}

/** Rows of every indexed station of a state, or only the first count of them. */
export function stateRows(state: string, hour = HOUR_22, count = 99): Row[] {
  return INDEX.filter((entry) => entry[3] === state)
    .slice(0, count)
    .flatMap(([name]) => stationRows(name, hour));
}

/** What the fake answers for a state: rows, or a whole response such as an error. */
export type Answer = (state: string) => Row[] | Response;

/** A fake API answering filters[state] from a function the test can change. */
export function fakeDataGovApi(answer: Answer = (state) => stateRows(state)): FakeFetcher {
  return createFakeFetcher((url) => {
    const records = answer(new URL(url).searchParams.get('filters[state]') ?? '');
    return Promise.resolve(
      records instanceof Response
        ? records
        : Response.json({ status: 'ok', total: records.length, count: records.length, records }),
    );
  });
}

/** The states a fake was asked for, in order. */
export function asked(api: FakeFetcher): (string | null)[] {
  return api.calls.map((call) => new URL(call.url).searchParams.get('filters[state]'));
}
