// Tests for the runtime air sources: the direct feed joins the chain when on, data.gov.in only with a key, and each
// upstream is held to its call budget.
import { describe, expect, it } from 'vitest';
import { UPSTREAM_BUDGET } from '../../../src/config/limits.js';
import { asClient } from '../../../src/server/air/budget.js';
import { createAirSources } from '../../../src/server/air/sources.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';

const unreachable = () => createFakeFetcher(() => Promise.reject(new TypeError('connect timeout')));

describe('createAirSources', () => {
  it('tries only the CPCB feed without a key', async () => {
    const fetcher = unreachable();
    const sources = createAirSources(fetcher.fetch, createFakeClock(), {
      directFeed: true,
      dataGovKey: null,
    });
    const read = await sources.stations.readStations();
    expect(sources.stationProviders).toEqual(['cpcb_feed']);
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
    expect(sources.stationProviders).toEqual(['cpcb_feed', 'data_gov_in']);
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual([
      'airquality.cpcb.gov.in',
      'api.data.gov.in',
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
    expect(fetcher.calls.map((call) => new URL(call.url).host)).toEqual([
      'api.data.gov.in',
      'api.data.gov.in',
    ]);
  });

  it('serves no station reading with the direct feed off and no key, so the modelled path answers', async () => {
    const fetcher = unreachable();
    const options = { directFeed: false, dataGovKey: null };
    const read = await createAirSources(fetcher.fetch, createFakeClock(), options).stations.readStations();
    expect(read.kind).toBe('miss');
    expect(fetcher.calls).toEqual([]);
  });

  it('lets one client cause only its share of Open-Meteo calls a minute, leaving the rest for others', async () => {
    const fetcher = unreachable();
    const sources = createAirSources(fetcher.fetch, createFakeClock(), {
      directFeed: false,
      dataGovKey: null,
    });
    const share = UPSTREAM_BUDGET.openMeteo.perClientPerMinute;
    const cells = Array.from({ length: share + 1 }, (_, index) => ({ lat: 8 + index, lon: 78 }));
    const results = await asClient('203.0.113.9', () =>
      Promise.all(cells.map((cell) => sources.forecast.readHours(cell))),
    );
    expect(results.at(-1)).toEqual({ ok: false, error: { kind: 'over_budget' } });
    expect(fetcher.calls).toHaveLength(share);
    const other = await asClient('198.51.100.4', () => sources.geocoder.search('Agra'));
    expect(other).toEqual({ ok: false, error: { kind: 'network' } });
    expect(fetcher.calls).toHaveLength(share + 1);
  });
});
