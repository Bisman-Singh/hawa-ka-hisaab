// The data.gov.in station provider: for a point it reads the states of the nearest indexed stations, each about once
// an hour. An answer caught mid rebuild is judged station by station and read again within a minute.
import index from '../data/stations.json' with { type: 'json' };
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import { stationFeedOf } from '../../features/air/cpcb-feed.js';
import { judgeStateAnswer, type StateCopy } from '../../features/air/state-copy.js';
import {
  dataGovPageSchema,
  dataGovStateUrl,
  dataGovStations,
  statesNear,
} from '../../features/air/data-gov.js';
import type { IndexedStation } from '../../features/air/data-gov.js';
import { locationSchema } from '../../features/air/schemas.js';
import type { AirProvider, FeedFailure, StationFeedRead } from '../../features/air/types.js';
import { createTtlCache, type CacheRead } from '../../lib/cache.js';
import { fetchJson } from '../../lib/http.js';
import { err, type Result } from '../../lib/result.js';
import { UNLIMITED, type UpstreamOptions } from './budget.js';
import { retryAfterMs } from '../../features/air/failures.js';

/** Time limit of one call. A state answers in 0.3 to 2 seconds; at the start of a rebuild it hangs past 20. */
export const DATA_GOV_TIMEOUT_MS = 5000;

/** Nearest indexed stations whose states are read for a point. */
export const STATIONS_PER_POINT = 4;

/** Pause before the one second attempt inside a request, and the least time that attempt may have. */
export const SECOND_ATTEMPT: Readonly<Record<'pauseMs' | 'minMs', number>> = { pauseMs: 1000, minMs: 2000 };

// Failures a pause of a second may fix: a rebuild in progress, a dropped connection, a gateway error, a garbled body.
const secondChance = (read: Result<StateCopy, FeedFailure>): boolean =>
  read.ok
    ? !read.value.whole
    : ['incomplete', 'network', 'invalid_body'].includes(read.error.kind) ||
      (read.error.kind === 'status' && read.error.status >= 500);

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

/** What the provider needs besides the upstream options. index defaults to the bundled one, wait to a timer. */
export interface DataGovOptions extends UpstreamOptions {
  readonly apiKey: string;
  readonly index?: readonly IndexedStation[];
  readonly wait?: (ms: number) => Promise<void>;
}

type Attempt = (timeoutMs: number) => Promise<Result<StateCopy, FeedFailure>>;

function stateAttempt(options: DataGovOptions, state: string, earlier: StateCopy | undefined): Attempt {
  const indexed = (options.index ?? STATION_INDEX).filter((entry) => entry[3] === state).length;
  return async (timeoutMs) => {
    if (!(await (options.budget ?? UNLIMITED).allow())) {
      return err({ kind: 'over_budget' });
    }
    const url = dataGovStateUrl(options.apiKey, state);
    const body = await fetchJson(options.fetcher, { url, timeoutMs, maxBytes: 1 << 20 }, dataGovPageSchema);
    const context = { indexed, now: options.clock.now() };
    return body.ok ? judgeStateAnswer(dataGovStations(body.value.records), earlier, context) : body;
  };
}

// One state read: one call, and a second after a short pause when the first may be fixed by it and enough of the
// time for one call is left, so the whole read never takes longer than one call could.
async function loadState(
  options: DataGovOptions,
  state: string,
  earlier: StateCopy | undefined,
): Promise<Result<StateCopy, FeedFailure>> {
  const attempt = stateAttempt(options, state, earlier);
  const started = options.clock.now();
  const first = await attempt(DATA_GOV_TIMEOUT_MS);
  const left = DATA_GOV_TIMEOUT_MS - (options.clock.now() - started) - SECOND_ATTEMPT.pauseMs;
  if (!secondChance(first) || left < SECOND_ATTEMPT.minMs) {
    return first;
  }
  await (options.wait ?? pause)(SECOND_ATTEMPT.pauseMs);
  const second = await attempt(left);
  return second.ok || !first.ok ? second : first;
}

type NotFresh = Exclude<CacheRead<StateCopy, FeedFailure>, { kind: 'fresh' }>;

// The states' copies as one read. A state that failed, or whose copy lacks stations or rows, makes it last_good.
function combine(reads: readonly CacheRead<StateCopy, FeedFailure>[]): StationFeedRead {
  const records = reads.flatMap((read) => (read.kind === 'miss' ? [] : read.value.feed.stations));
  const failed = reads.find((read): read is NotFresh => read.kind !== 'fresh');
  const partial = reads.some((read) => read.kind !== 'miss' && !read.value.whole);
  const failure: FeedFailure | null = failed?.error ?? (partial ? { kind: 'incomplete' } : null);
  const feed = stationFeedOf('data_gov_in', records);
  if (!feed.ok) {
    return { kind: 'miss', failure: failure ?? { kind: 'invalid_body' } };
  }
  return failure ? { kind: 'last_good', feed: feed.value, failure } : { kind: 'fresh', feed: feed.value };
}

/** Builds the provider. The key is sent only in the request URL, as the API requires, and never logged. */
export function createDataGovProvider(options: DataGovOptions): AirProvider {
  const cache = createTtlCache<StateCopy, FeedFailure>({
    ttlMs: (copy) => copy.ttlMs,
    retryAfterFailureMs: retryAfterMs,
    maxEntries: 64,
    clock: options.clock,
  });
  return {
    readStations: async (near) => {
      const states = near ? statesNear(options.index ?? STATION_INDEX, near, STATIONS_PER_POINT) : [];
      const reads = states.map((state) => cache.read(state, (earlier) => loadState(options, state, earlier)));
      return combine(await Promise.all(reads));
    },
  };
}
