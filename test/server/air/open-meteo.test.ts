// Tests for the Open-Meteo adapters over a fake fetch: rounding, caching, failures and search mapping.
import { describe, expect, it } from 'vitest';
import {
  createOpenMeteoForecast,
  createOpenMeteoGeocoder,
  FORECAST_TTL_MS,
} from '../../../src/server/air/open-meteo.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';
import { sampleAirAnswer, sampleSearchResult } from '../../support/open-meteo-samples.js';

describe('createOpenMeteoForecast', () => {
  it('asks for the point rounded to one decimal and reuses the curve for half an hour', async () => {
    const clock = createFakeClock();
    const fetcher = createFakeFetcher(() => Promise.resolve(Response.json(sampleAirAnswer())));
    const forecast = createOpenMeteoForecast(fetcher.fetch, clock);
    const first = await forecast.readHours({ lat: 28.54, lon: 77.17 });
    expect(first.ok && first.value.hours).toHaveLength(3);
    await forecast.readHours({ lat: 28.53, lon: 77.21 });
    expect(fetcher.calls).toHaveLength(1);
    expect(new URL(fetcher.calls[0]?.url ?? 'https://x').searchParams.get('latitude')).toBe('28.5');
    clock.advance(FORECAST_TTL_MS);
    await forecast.readHours({ lat: 28.54, lon: 77.17 });
    expect(fetcher.calls).toHaveLength(2);
  });

  it('reports a failure when nothing good is cached', async () => {
    const fetcher = createFakeFetcher(() =>
      Promise.resolve(Response.json({ error: true, reason: 'x' }, { status: 400 })),
    );
    const result = await createOpenMeteoForecast(fetcher.fetch, createFakeClock()).readHours({
      lat: 20,
      lon: 78,
    });
    expect(result).toEqual({ ok: false, error: { kind: 'status', status: 400 } });
  });
});

describe('createOpenMeteoGeocoder', () => {
  it('maps results to places and reads a missing results key as not found', async () => {
    let answer: unknown = { results: [sampleSearchResult()] };
    const fetcher = createFakeFetcher(() => Promise.resolve(Response.json(answer)));
    const geocoder = createOpenMeteoGeocoder(fetcher.fetch);
    expect(await geocoder.search('Muzaffarpur')).toMatchObject({
      ok: true,
      value: [{ name: 'Muzaffarpur' }],
    });
    answer = { generationtime_ms: 0.6 };
    expect(await geocoder.search('Xqzzyv')).toEqual({ ok: true, value: [] });
  });

  it('passes on an upstream failure', async () => {
    const fetcher = createFakeFetcher(() => Promise.reject(new TypeError('fetch failed')));
    expect(await createOpenMeteoGeocoder(fetcher.fetch).search('Delhi')).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });
});
