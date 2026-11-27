// Tests for GET /api/air through the whole app with fake sources, one per air card state the product lists.
import { describe, expect, it } from 'vitest';
import { airResponseSchema } from '../../../src/features/air/contract.js';
import type { AirResponse, AirSources, StationFeedRead } from '../../../src/features/air/types.js';
import { err, ok } from '../../../src/lib/result.js';
import { createApp } from '../../../src/server/app.js';
import { createFakeAirSources } from '../../support/fake-air-sources.js';
import {
  createFakeAirProvider,
  createFakeForecastProvider,
  hourCurve,
  rkPuramStation,
  stationFeed,
} from '../../support/fake-air.js';
import { createTestDeps } from '../../support/test-deps.js';

const HOUR = 3_600_000;
const DELHI = '/api/air?lat=28.54&lon=77.17';
const FAR = '/api/air?lat=23.25&lon=77.4';

function modelCurve() {
  const curve = hourCurve(
    Array.from({ length: 30 }, () => 95),
    '2026-11-23T22:00:00+05:30',
  );
  return { ...curve, hours: curve.hours.map((hour) => ({ ...hour, pm10: 150, no2: 40, co: 900 })) };
}

function setup(reads: StationFeedRead[], forecastUp = true, extra: Partial<AirSources> = {}) {
  const forecast = createFakeForecastProvider(forecastUp ? ok(modelCurve()) : err({ kind: 'timeout' }));
  const air = createFakeAirSources({ stations: createFakeAirProvider(reads), forecast, ...extra });
  const test = createTestDeps({ air });
  return { test, app: createApp(test.deps) };
}

async function get(
  app: ReturnType<typeof createApp>,
  path: string,
): Promise<{ status: number; body: AirResponse }> {
  const response = await app.request(path);
  return { status: response.status, body: airResponseSchema.parse(await response.json()) };
}

const fresh: StationFeedRead = { kind: 'fresh', feed: stationFeed() };

describe('GET /api/air', () => {
  it('shows the nearest station with CPCB AQI, the feed hour, the curve and GRAP in Delhi, cached five minutes', async () => {
    const { app } = setup([fresh]);
    const response = await app.request(DELHI);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300, s-maxage=300');
    const body = airResponseSchema.parse(await response.json());
    expect(body.reading).toMatchObject({ path: 'station', aqi: { value: 246, band: 'poor' }, stale: false });
    expect(body.feed).toEqual({ fetch: 'ok', feedHour: '2026-11-24T22:00:00+05:30', stale: false });
    expect(body.forecast?.kind).toBe('model_forecast');
    expect(body.grap).toEqual({
      region: 'delhi_ncr',
      stage: 'II',
      orderDate: '2026-11-17',
      factId: 'grap-stage-order',
    });
  });

  it('uses the modelled estimate with its reason when no station is within 50 km, and no GRAP', async () => {
    const { body } = await get(setup([fresh]).app, FAR);
    expect(body.reading).toMatchObject({
      path: 'modelled',
      reason: 'no_station_in_range',
      estimate: { status: 'computed' },
    });
    expect(body.grap).toBeNull();
  });

  it('says CPCB published no AQI for a station with a blank AQI', async () => {
    const { body } = await get(setup([{ kind: 'fresh', feed: stationFeed([rkPuramStation()]) }]).app, DELHI);
    expect(body.reading).toMatchObject({ path: 'station', aqi: null });
  });

  it('flags a stale feed with its hour', async () => {
    const { app, test } = setup([fresh]);
    test.clock.advance(4 * HOUR);
    const { body } = await get(app, DELHI);
    expect(body.feed).toMatchObject({ stale: true, feedHour: '2026-11-24T22:00:00+05:30' });
    expect(body.reading).toMatchObject({ path: 'station', stale: true });
  });

  it('serves the last good snapshot when the feed is down, says why, logs it and lets a retry through', async () => {
    const { app, test } = setup([{ kind: 'last_good', feed: stationFeed(), failure: { kind: 'timeout' } }]);
    const response = await app.request(DELHI);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = airResponseSchema.parse(await response.json());
    expect(body.feed).toEqual({
      fetch: 'failed',
      feedHour: '2026-11-24T22:00:00+05:30',
      stale: false,
      problem: 'no_answer',
    });
    expect(body.reading.path).toBe('station');
    expect(test.logText()).toContain('"upstream":"cpcb"');
  });

  it('falls back to the model when the feed is down with nothing cached, and is not cached itself', async () => {
    const { app } = setup([{ kind: 'miss', failure: { kind: 'network' } }]);
    const response = await app.request(DELHI);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = airResponseSchema.parse(await response.json());
    expect(body.feed).toEqual({ fetch: 'failed', feedHour: null, stale: false, problem: 'no_answer' });
    expect(body.reading).toMatchObject({
      path: 'modelled',
      reason: 'feed_unavailable',
      nearestStationKm: null,
    });
  });

  it('says the source is being updated when it answered mid rebuild, with a retry, never a wrong reason', async () => {
    const far = { ...rkPuramStation(), station: { ...rkPuramStation().station, lat: 30.9, lon: 75.85 } };
    const partial: StationFeedRead = {
      kind: 'last_good',
      feed: stationFeed([far]),
      failure: { kind: 'incomplete' },
    };
    const { body } = await get(setup([partial]).app, DELHI);
    expect(body.feed).toMatchObject({ fetch: 'failed', problem: 'updating' });
    expect(body.reading).toMatchObject({ path: 'modelled', reason: 'feed_unavailable' });
    const near: StationFeedRead = { ...partial, feed: stationFeed() };
    const { body: withStation } = await get(setup([near]).app, DELHI);
    expect(withStation.reading).toMatchObject({ path: 'station', aqi: { value: 246 } });
    expect(withStation.feed.problem).toBe('updating');
  });

  it('keeps the station reading without a curve when the forecast is down, and does not cache that', async () => {
    const { app, test } = setup([fresh], false);
    const response = await app.request(DELHI);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = airResponseSchema.parse(await response.json());
    expect(body.reading.path).toBe('station');
    expect(body.forecast).toBeNull();
    expect(test.logText()).toContain('"upstream":"open-meteo"');
  });

  it('says nothing answered when the feed and the model are both down', async () => {
    const { body } = await get(setup([{ kind: 'miss', failure: { kind: 'network' } }], false).app, DELHI);
    expect(body.reading).toEqual({ path: 'unavailable', reason: 'feed_and_model_down' });
  });

  it('refuses coordinates outside India and coordinates finer than two decimals', async () => {
    const { app } = setup([fresh]);
    for (const path of [
      '/api/air?lat=51.5&lon=-0.12',
      '/api/air?lat=28.5407&lon=77.17',
      '/api/air?lat=x&lon=77',
    ]) {
      const response = await app.request(path);
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });
});
