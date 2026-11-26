// Tests for the runtime air sources: data.gov.in joins the station chain only when a key is set.
import { describe, expect, it } from 'vitest';
import { createAirSources } from '../../../src/server/air/sources.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';

const unreachable = () => createFakeFetcher(() => Promise.reject(new TypeError('connect timeout')));

describe('createAirSources', () => {
  it('tries only the CPCB feed without a key', async () => {
    const fetcher = unreachable();
    const read = await createAirSources(fetcher.fetch, createFakeClock(), null).stations.readStations();
    expect(read.kind).toBe('miss');
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual(['airquality.cpcb.gov.in']);
  });

  it('falls through to data.gov.in with a key', async () => {
    const fetcher = unreachable();
    const sources = createAirSources(fetcher.fetch, createFakeClock(), 'test-data-key');
    await sources.stations.readStations({ lat: 28.54, lon: 77.17 });
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual([
      'airquality.cpcb.gov.in',
      'api.data.gov.in',
    ]);
  });
});
