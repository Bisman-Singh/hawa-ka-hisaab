// The data.gov.in station provider: for a point it reads the states holding the nearest indexed stations, each
// once an hour, about a second cold. A state answer caught mid rebuild, clearly smaller than before, is refused.
import index from '../data/stations.json' with { type: 'json' };
import { z } from 'zod';
import { stationFeedOf } from '../../features/air/cpcb-feed.js';
import { dataGovFeed, dataGovPageSchema, dataGovStateUrl, statesNear } from '../../features/air/data-gov.js';
import type { IndexedStation } from '../../features/air/data-gov.js';
import { locationSchema } from '../../features/air/schemas.js';
import type { AirProvider, StationFeed, StationFeedRead, StationRecord } from '../../features/air/types.js';
import { UPSTREAM_TIMEOUT_MS } from '../../config/limits.js';
import { createTtlCache, type CacheRead } from '../../lib/cache.js';
import type { Clock } from '../../lib/clock.js';
import { fetchJson, type Fetcher, type HttpFailure } from '../../lib/http.js';
import { err, type Result } from '../../lib/result.js';
import { FEED_TTL_MS } from './cpcb.js';

/** Nearest indexed stations whose states are read for a point. */
export const STATIONS_PER_POINT = 4;

/** Wait before asking again after a failed or refused answer, such as one caught mid rebuild. */
export const DATA_GOV_RETRY_MS = 2 * 60_000;

const HOUR_MS = 3_600_000;
const indexSchema = z.array(
  z.tuple([
    z.string().min(1).max(160),
    locationSchema.shape.lat,
    locationSchema.shape.lon,
    z.string().min(1),
  ]),
);

/** The bundled index, built by scripts/build-station-index.ts from one full answer of the resource. */
export const STATION_INDEX: readonly IndexedStation[] = indexSchema.parse(index);

/** What the provider needs. index defaults to the bundled one. */
export interface DataGovOptions {
  readonly fetcher: Fetcher;
  readonly clock: Clock;
  readonly apiKey: string;
  readonly index?: readonly IndexedStation[];
}

// Refused: an older hour; fewer than half the stations the index lists; or under 80 percent of the last good
// copy within two hours of it. Past two hours a smaller state is taken, as a station may really have gone.
function refused(next: StationFeed, previous: StationFeed | undefined, indexed: number): boolean {
  const ageMs = Date.parse(next.feedHour) - Date.parse(previous?.feedHour ?? next.feedHour);
  const shrunk = next.stations.length < 0.8 * (previous?.stations.length ?? 0) && ageMs < 2 * HOUR_MS;
  return ageMs < 0 || next.stations.length < indexed / 2 || shrunk;
}

type StateLoad = (state: string) => Promise<Result<StationFeed, HttpFailure>>;

function stateLoader(options: DataGovOptions, stations: readonly IndexedStation[]): StateLoad {
  const kept = new Map<string, StationFeed>();
  return async (state) => {
    const url = dataGovStateUrl(options.apiKey, state);
    const body = await fetchJson(
      options.fetcher,
      { url, timeoutMs: UPSTREAM_TIMEOUT_MS, maxBytes: 1 << 20 },
      dataGovPageSchema,
    );
    const feed = body.ok ? dataGovFeed(body.value.records) : body;
    const indexed = stations.filter((entry) => entry[3] === state).length;
    if (feed.ok && !refused(feed.value, kept.get(state), indexed)) {
      kept.set(state, feed.value);
      return feed;
    }
    return body.ok ? err({ kind: 'invalid_body' }) : body;
  };
}

type NotFresh = Exclude<CacheRead<StationFeed, HttpFailure>, { kind: 'fresh' }>;

// Any state that failed makes the copy partial: it is served as a last good read with that state's failure.
function combine(reads: readonly CacheRead<StationFeed, HttpFailure>[]): StationFeedRead {
  const records: StationRecord[] = reads.flatMap((read) => (read.kind === 'miss' ? [] : read.value.stations));
  const failed = reads.find((read): read is NotFresh => read.kind !== 'fresh');
  const feed = stationFeedOf('data_gov_in', records);
  if (!feed.ok) {
    return { kind: 'miss', failure: failed?.error ?? { kind: 'invalid_body' } };
  }
  return failed
    ? { kind: 'last_good', feed: feed.value, failure: failed.error }
    : { kind: 'fresh', feed: feed.value };
}

/** Builds the provider. The key is sent only in the request URL, as the API requires, and never logged. */
export function createDataGovProvider(options: DataGovOptions): AirProvider {
  const stations = options.index ?? STATION_INDEX;
  const load = stateLoader(options, stations);
  const cache = createTtlCache<StationFeed, HttpFailure>({
    ttlMs: FEED_TTL_MS,
    retryAfterFailureMs: DATA_GOV_RETRY_MS,
    maxEntries: 64,
    clock: options.clock,
  });
  return {
    readStations: async (near) => {
      const states = near ? statesNear(stations, near, STATIONS_PER_POINT) : [];
      return combine(await Promise.all(states.map((state) => cache.read(state, () => load(state)))));
    },
  };
}
