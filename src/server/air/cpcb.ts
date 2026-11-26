// The CPCB feed fetched directly, behind the AirProvider port, and the cache both station providers share: one
// fetch an hour while a source answers, one shared load for concurrent reads, the last good copy on failure.
import { CPCB_FEED_MAX_BYTES, parseCpcbFeed } from '../../features/air/cpcb-feed.js';
import type { AirProvider, StationFeed } from '../../features/air/types.js';
import { CPCB_FEED } from '../../config/facts/air/sources.js';
import { createTtlCache } from '../../lib/cache.js';
import type { Clock } from '../../lib/clock.js';
import { fetchText, type Fetcher, type HttpFailure } from '../../lib/http.js';
import { err, ok, type Result } from '../../lib/result.js';

/** How long a good copy is used before the next fetch. */
export const FEED_TTL_MS = 60 * 60_000;

/**
 * Time limit for the direct feed. Its host accepts some networks and lets others time out at connect, and fetch
 * has no separate connect limit, so the whole request gets 3 seconds; the real feed loads in well under one.
 */
export const DIRECT_TIMEOUT_MS = 3000;

/** After a failed direct fetch, the wait before trying again, so a host it cannot reach rarely pays the wait. */
export const DIRECT_RETRY_MS = 30 * 60_000;

/** How a cached provider refreshes. */
export interface RefreshPolicy {
  readonly clock: Clock;
  readonly ttlMs: number;
  readonly retryMs: number;
}

/** Wraps a loader in the hourly cache and maps cache reads to feed reads. */
export function cachedProvider(
  load: () => Promise<Result<StationFeed, HttpFailure>>,
  policy: RefreshPolicy,
): AirProvider {
  const cache = createTtlCache<StationFeed, HttpFailure>({
    ttlMs: policy.ttlMs,
    retryAfterFailureMs: policy.retryMs,
    maxEntries: 1,
    clock: policy.clock,
  });
  return {
    readStations: async () => {
      const read = await cache.read('stations', load);
      if (read.kind === 'fresh') {
        return { kind: 'fresh', feed: read.value };
      }
      return read.kind === 'last_good'
        ? { kind: 'last_good', feed: read.value, failure: read.error }
        : { kind: 'miss', failure: read.error };
    },
  };
}

async function loadFeed(fetcher: Fetcher): Promise<Result<StationFeed, HttpFailure>> {
  const text = await fetchText(fetcher, {
    url: CPCB_FEED.url,
    timeoutMs: DIRECT_TIMEOUT_MS,
    maxBytes: CPCB_FEED_MAX_BYTES,
    headers: { accept: 'application/xml' },
  });
  if (!text.ok) {
    return text;
  }
  const feed = parseCpcbFeed(text.value);
  return feed.ok ? ok(feed.value) : err({ kind: 'invalid_body' });
}

/** Builds the direct feed provider. The feed has no ETag and is never compressed, so this cache is the only one. */
export function createCpcbProvider(fetcher: Fetcher, clock: Clock): AirProvider {
  return cachedProvider(() => loadFeed(fetcher), { clock, ttlMs: FEED_TTL_MS, retryMs: DIRECT_RETRY_MS });
}
