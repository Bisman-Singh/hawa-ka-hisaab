// Tests for the runtime air sources: the direct feed joins the chain when on, data.gov.in only with a key.
import { describe, expect, it } from 'vitest';
import { createAirSources } from '../../../src/server/air/sources.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';

const unreachable = () => createFakeFetcher(() => Promise.reject(new TypeError('connect timeout')));

describe('createAirSources', () => {
  it('tries only the CPCB feed without a key', async () => {
    const fetcher = unreachable();
    const read = await createAirSources(fetcher.fetch, createFakeClock(), {
      directFeed: true,
      dataGovKey: null,
    }).stations.readStations();
    expect(read.kind).toBe('miss');
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual(['airquality.cpcb.gov.in']);
  });

  it('falls through to data.gov.in with a key', async () => {
    const fetcher = unreachable();
    const sources = createAirSources(fetcher.fetch, createFakeClock(), {
      directFeed: true,
      dataGovKey: 'test-data-key',
    });
    await sources.stations.readStations({ lat: 28.54, lon: 77.17 });
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual([
      'airquality.cpcb.gov.in',
      'api.data.gov.in',
    ]);
  });

  it('skips the direct feed when it is off, so a host it does not answer never waits for it', async () => {
    const fetcher = unreachable();
    const options = { directFeed: false, dataGovKey: 'test-data-key' };
    await createAirSources(fetcher.fetch, createFakeClock(), options).stations.readStations({
      lat: 28.54,
      lon: 77.17,
    });
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual(['api.data.gov.in']);
  });

  it('serves no station reading with the direct feed off and no key, so the modelled path answers', async () => {
    const fetcher = unreachable();
    const options = { directFeed: false, dataGovKey: null };
    const read = await createAirSources(fetcher.fetch, createFakeClock(), options).stations.readStations();
    expect(read.kind).toBe('miss');
    expect(fetcher.calls).toEqual([]);
  });
});
