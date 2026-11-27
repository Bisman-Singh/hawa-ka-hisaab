// Tests for the Open-Meteo adapters over a fake fetch: the model grid, caching, last good copies, the call budget,
// failures and search mapping.
import { describe, expect, it } from 'vitest';
import {
  createOpenMeteoForecast,
  createOpenMeteoGeocoder,
  FORECAST_MAX_AGE_MS,
  FORECAST_TTL_MS,
  gridCell,
  placeQueryKey,
  PLACES_TTL_MS,
} from '../../../src/server/air/open-meteo.js';
import type { UpstreamBudget } from '../../../src/server/air/budget.js';
import { INDIA_BOUNDS } from '../../../src/config/limits.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeFetcher } from '../../support/fake-fetch.js';
import { sampleAirAnswer, sampleSearchResult } from '../../support/open-meteo-samples.js';

const asked = (fetcher: ReturnType<typeof createFakeFetcher>, name: string) =>
  fetcher.calls.map((call) => new URL(call.url).searchParams.get(name));

function switchable(responses: { ok: boolean }) {
  return createFakeFetcher(() =>
    Promise.resolve(
      responses.ok ? Response.json(sampleAirAnswer()) : Response.json({ error: true }, { status: 429 }),
    ),
  );
}

describe('gridCell', () => {
  it('moves a point to the nearest node of the 0.4 degree grid, the same node Open-Meteo answers from', () => {
    expect(gridCell({ lat: 28.63, lon: 77.22 })).toEqual({ lat: 28.8, lon: 77.2 });
    expect(gridCell({ lat: 19.07, lon: 72.87 })).toEqual({ lat: 19.2, lon: 72.8 });
    expect(gridCell({ lat: 28.59, lon: 77.39 })).toEqual({ lat: 28.4, lon: 77.2 });
    const corners = [
      { lat: INDIA_BOUNDS.minLat, lon: INDIA_BOUNDS.minLon },
      { lat: INDIA_BOUNDS.maxLat, lon: INDIA_BOUNDS.maxLon },
    ];
    expect(corners.map(gridCell)).toEqual(corners);
  });
});

describe('createOpenMeteoForecast', () => {
  it('asks once for every point in a grid cell and reuses the curve for an hour', async () => {
    const clock = createFakeClock();
    const fetcher = createFakeFetcher(() => Promise.resolve(Response.json(sampleAirAnswer())));
    const forecast = createOpenMeteoForecast({ fetcher: fetcher.fetch, clock });
    const first = await forecast.readHours({ lat: 28.63, lon: 77.22 });
    expect(first.ok && first.value.hours).toHaveLength(3);
    await forecast.readHours({ lat: 28.7, lon: 77.3 });
    expect(asked(fetcher, 'latitude')).toEqual(['28.8']);
    expect(asked(fetcher, 'longitude')).toEqual(['77.2']);
    clock.advance(FORECAST_TTL_MS);
    await forecast.readHours({ lat: 28.63, lon: 77.22 });
    expect(fetcher.calls).toHaveLength(2);
  });

  it('serves the last good curve while the upstream refuses, for at most twelve hours', async () => {
    const clock = createFakeClock();
    const responses = { ok: true };
    const forecast = createOpenMeteoForecast({ fetcher: switchable(responses).fetch, clock });
    await forecast.readHours({ lat: 20, lon: 78 });
    responses.ok = false;
    clock.advance(FORECAST_MAX_AGE_MS);
    expect((await forecast.readHours({ lat: 20, lon: 78 })).ok).toBe(true);
    clock.advance(60_001);
    expect(await forecast.readHours({ lat: 20, lon: 78 })).toEqual({
      ok: false,
      error: { kind: 'status', status: 429 },
    });
  });

  it('reports a failure when nothing good is cached', async () => {
    const fetcher = createFakeFetcher(() =>
      Promise.resolve(Response.json({ error: true, reason: 'x' }, { status: 400 })),
    );
    const result = await createOpenMeteoForecast({
      fetcher: fetcher.fetch,
      clock: createFakeClock(),
    }).readHours({
      lat: 20,
      lon: 78,
    });
    expect(result).toEqual({ ok: false, error: { kind: 'status', status: 400 } });
  });

  it('makes no call over its budget, and asks again as soon as the budget allows', async () => {
    let allowed = false;
    const budget: UpstreamBudget = { allow: () => Promise.resolve(allowed) };
    const fetcher = createFakeFetcher(() => Promise.resolve(Response.json(sampleAirAnswer())));
    const forecast = createOpenMeteoForecast({ fetcher: fetcher.fetch, clock: createFakeClock(), budget });
    expect(await forecast.readHours({ lat: 20, lon: 78 })).toEqual({
      ok: false,
      error: { kind: 'over_budget' },
    });
    expect(fetcher.calls).toHaveLength(0);
    allowed = true;
    expect((await forecast.readHours({ lat: 20, lon: 78 })).ok).toBe(true);
  });
});

describe('createOpenMeteoGeocoder', () => {
  const geocoderOver = (answer: () => unknown) => {
    const fetcher = createFakeFetcher(() => Promise.resolve(Response.json(answer())));
    const clock = createFakeClock();
    return { fetcher, clock, geocoder: createOpenMeteoGeocoder({ fetcher: fetcher.fetch, clock }) };
  };

  it('maps results to places and reads a missing results key as not found', async () => {
    let answer: unknown = { results: [sampleSearchResult()] };
    const { geocoder } = geocoderOver(() => answer);
    expect(await geocoder.search('Muzaffarpur')).toMatchObject({
      ok: true,
      value: [{ name: 'Muzaffarpur' }],
    });
    answer = { generationtime_ms: 0.6 };
    expect(await geocoder.search('Xqzzyv')).toEqual({ ok: true, value: [] });
  });

  it('asks once a day for each search however it is spaced or capitalised, sharing a search in flight', async () => {
    const { fetcher, clock, geocoder } = geocoderOver(() => ({ results: [sampleSearchResult()] }));
    await Promise.all([geocoder.search('New  Delhi'), geocoder.search(' new delhi ')]);
    await geocoder.search('NEW DELHI');
    expect(asked(fetcher, 'name')).toEqual(['new delhi']);
    clock.advance(PLACES_TTL_MS);
    await geocoder.search('New Delhi');
    expect(fetcher.calls).toHaveLength(2);
  });

  it('passes on an upstream failure and serves the last good answer once it has one', async () => {
    const fetcher = createFakeFetcher(() => Promise.reject(new TypeError('fetch failed')));
    expect(
      await createOpenMeteoGeocoder({ fetcher: fetcher.fetch, clock: createFakeClock() }).search('Delhi'),
    ).toEqual({ ok: false, error: { kind: 'network' } });
    let up = true;
    const clock = createFakeClock();
    const flaky = createFakeFetcher(() =>
      up
        ? Promise.resolve(Response.json({ results: [sampleSearchResult()] }))
        : Promise.reject(new TypeError('x')),
    );
    const geocoder = createOpenMeteoGeocoder({ fetcher: flaky.fetch, clock });
    await geocoder.search('Muzaffarpur');
    up = false;
    clock.advance(PLACES_TTL_MS);
    expect(await geocoder.search('Muzaffarpur')).toMatchObject({
      ok: true,
      value: [{ name: 'Muzaffarpur' }],
    });
  });

  it('keys searches by their plain form', () => {
    expect(placeQueryKey('  Navi   Mumbai ')).toBe('navi mumbai');
    expect(placeQueryKey('Puné')).toBe(placeQueryKey('Puné'));
  });
});
