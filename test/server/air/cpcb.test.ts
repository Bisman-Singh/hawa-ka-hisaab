// Tests for the direct CPCB feed provider: hourly cache, shared loads, last good copy, the short time limit.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CPCB_FEED_MAX_BYTES } from '../../../src/features/air/cpcb-feed.js';
import {
  createCpcbProvider,
  DIRECT_RETRY_MS,
  DIRECT_TIMEOUT_MS,
  FEED_TTL_MS,
} from '../../../src/server/air/cpcb.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher, hangingFetcher } from '../../support/fake-fetch.js';
import { readCpcbFixture } from '../../support/fixtures.js';

const fixture = readCpcbFixture();
const feedOk = () => Promise.resolve(new Response(fixture, { status: 200 }));

afterEach(() => {
  vi.useRealTimers();
});

describe('createCpcbProvider', () => {
  it('fetches the feed URL at most once an hour and shares one load between concurrent reads', async () => {
    const clock = createFakeClock();
    const fetcher = createFakeFetcher(feedOk);
    const provider = createCpcbProvider(fetcher.fetch, clock);
    const [first, second] = await Promise.all([provider.readStations(), provider.readStations()]);
    expect(first.kind).toBe('fresh');
    expect(second).toEqual(first);
    clock.advance(FEED_TTL_MS - 1);
    await provider.readStations();
    expect(fetcher.calls.map((call) => call.url)).toEqual(['https://airquality.cpcb.gov.in/caaqms/rss_feed']);
    clock.advance(1);
    await provider.readStations();
    expect(fetcher.calls).toHaveLength(2);
  });

  it('serves the last good copy when a fetch fails, and waits before trying again', async () => {
    const clock = createFakeClock();
    let up = true;
    const fetcher = createFakeFetcher(() =>
      up ? feedOk() : Promise.resolve(new Response('', { status: 503 })),
    );
    const provider = createCpcbProvider(fetcher.fetch, clock);
    await provider.readStations();
    up = false;
    clock.advance(FEED_TTL_MS);
    const down = await provider.readStations();
    expect(down).toMatchObject({ kind: 'last_good', failure: { kind: 'status', status: 503 } });
    clock.advance(DIRECT_RETRY_MS - 1);
    await provider.readStations();
    expect(fetcher.calls).toHaveLength(2);
  });

  it('reports a miss with nothing cached, for a body that is not the feed and for one too big', async () => {
    const notFeed = createFakeFetcher(() => Promise.resolve(new Response('<html></html>')));
    expect(await createCpcbProvider(notFeed.fetch, createFakeClock()).readStations()).toEqual({
      kind: 'miss',
      failure: { kind: 'invalid_body' },
    });
    const big = createFakeFetcher(() =>
      Promise.resolve(new Response('x', { headers: { 'content-length': String(CPCB_FEED_MAX_BYTES + 1) } })),
    );
    expect(await createCpcbProvider(big.fetch, createFakeClock()).readStations()).toEqual({
      kind: 'miss',
      failure: { kind: 'too_large' },
    });
  });

  it('gives up after the short time limit when the host does not answer', async () => {
    vi.useFakeTimers();
    const read = createCpcbProvider(hangingFetcher(), createFakeClock()).readStations();
    await vi.advanceTimersByTimeAsync(DIRECT_TIMEOUT_MS);
    expect(await read).toEqual({ kind: 'miss', failure: { kind: 'timeout' } });
    expect(DIRECT_TIMEOUT_MS).toBe(3000);
  });
});
