// Tests for assembling the air card: station choice, CPCB's AQI passed through, staleness and the modelled path.
import { describe, expect, it } from 'vitest';
import { airResponseSchema } from '../../../src/features/air/contract.js';
import { buildAirResponse, type AirInput } from '../../../src/features/air/reading.js';
import type {
  HourCurve,
  StationFeed,
  StationFeedRead,
  StationRecord,
} from '../../../src/features/air/types.js';
import { err, ok } from '../../../src/lib/result.js';
import { hourCurve, jnuStation, rkPuramStation, stationFeed } from '../../support/fake-air.js';
import { FIXTURE_HOUR_MS } from '../../support/fake-clock.js';

const HOUR = 3_600_000;
const JNU = { lat: 28.54, lon: 77.17 };
const FAR_FROM_ALL = { lat: 23.25, lon: 77.4 };

function modelCurve(): HourCurve {
  const curve = hourCurve(
    Array.from({ length: 48 }, () => 70),
    '2026-11-23T23:00:00+05:30',
  );
  return { ...curve, hours: curve.hours.map((hour) => ({ ...hour, pm10: 120, no2: 40, co: 1200 })) };
}

function input(overrides: Partial<AirInput> = {}): AirInput {
  return {
    location: JNU,
    feed: { kind: 'fresh', feed: stationFeed() },
    forecast: ok(modelCurve()),
    now: FIXTURE_HOUR_MS + 20 * 60_000,
    grap: null,
    ...overrides,
  };
}

const withAqi = (record: StationRecord, aqiValue: number | null): StationRecord => ({ ...record, aqiValue });

describe('the station path', () => {
  it("passes CPCB's published AQI through untouched even when the sub-indices say otherwise", () => {
    const odd: StationRecord = { ...withAqi(jnuStation(), 31), predominant: 'o3' };
    const response = buildAirResponse(input({ feed: { kind: 'fresh', feed: stationFeed([odd]) } }));
    expect(response.reading.path).toBe('station');
    expect(response.reading.path === 'station' && response.reading.aqi).toEqual({
      value: 31,
      band: 'good',
      predominant: 'o3',
    });
    expect(response.reading.path === 'station' && response.reading.pollutants).toEqual(
      jnuStation().pollutants,
    );
  });

  it('says which copy of the data served the reading', () => {
    const feed: StationFeed = { ...stationFeed(), provider: 'data_gov_in' };
    const response = buildAirResponse(input({ feed: { kind: 'fresh', feed } }));
    expect(response.reading.path === 'station' && response.reading.provider).toBe('data_gov_in');
    expect(buildAirResponse(input()).reading).toMatchObject({ provider: 'cpcb_feed' });
  });

  it('says in data that CPCB published no AQI for the station when the AQI is blank', () => {
    const response = buildAirResponse(
      input({ feed: { kind: 'fresh', feed: stationFeed([rkPuramStation()]) } }),
    );
    expect(response.reading.path === 'station' && response.reading.aqi).toBeNull();
    expect(airResponseSchema.safeParse(response).success).toBe(true);
  });
});

describe('staleness', () => {
  it('flags a stale feed and a stale station reading with their hour', () => {
    const response = buildAirResponse(input({ now: FIXTURE_HOUR_MS + 3 * HOUR + 60_000 }));
    expect(response.feed).toEqual({ fetch: 'ok', feedHour: '2026-11-24T22:00:00+05:30', stale: true });
    expect(response.reading.path === 'station' && response.reading.stale).toBe(true);
    expect(response.reading.path === 'station' && response.reading.readingHour).toBe(
      '2026-11-24T22:00:00+05:30',
    );
  });

  it('does not flag a reading exactly three hours old', () => {
    const response = buildAirResponse(input({ now: FIXTURE_HOUR_MS + 3 * HOUR }));
    expect(response.feed.stale).toBe(false);
  });
});

describe('the modelled path', () => {
  const modelled = buildAirResponse(input({ location: FAR_FROM_ALL }));

  it('is used when no station lies within 50 km, and says why', () => {
    expect(modelled.reading.path).toBe('modelled');
    expect(modelled.reading.path === 'modelled' && modelled.reading.reason).toBe('no_station_in_range');
    expect(airResponseSchema.safeParse(modelled).success).toBe(true);
  });

  it('never carries the station kind or the words live or measured', () => {
    const text = JSON.stringify(modelled.reading);
    expect(text).not.toMatch(/"path":"station"/);
    expect(text).not.toMatch(/\blive\b|measur/i);
    expect(modelled.reading).not.toHaveProperty('station');
    expect(modelled.reading).not.toHaveProperty('aqi');
  });

  it('labels its index an estimate computed from modelled means', () => {
    const estimate = modelled.reading.path === 'modelled' ? modelled.reading.estimate : null;
    expect(estimate?.status).toBe('computed');
  });

  it('says a station was in range but had no reading when that is why', () => {
    const silent: StationRecord = {
      ...jnuStation(),
      aqiValue: null,
      pollutants: [{ pollutant: 'pm25', hourlySubIndex: null, avg: null, min: null, max: null }],
    };
    const response = buildAirResponse(input({ feed: { kind: 'fresh', feed: stationFeed([silent]) } }));
    expect(response.reading).toMatchObject({
      path: 'modelled',
      reason: 'no_station_reading',
      nearestStationKm: 0.2,
    });
  });

  it('is used with its reason when the feed is down and nothing is cached', () => {
    const down = buildAirResponse(input({ feed: { kind: 'miss', failure: { kind: 'timeout' } } }));
    expect(down.feed).toEqual({ fetch: 'failed', feedHour: null, stale: false, problem: 'no_answer' });
    expect(down.reading.path === 'modelled' && down.reading.reason).toBe('feed_unavailable');
    expect(down.reading.path === 'modelled' && down.reading.nearestStationKm).toBeNull();
  });
});

describe('when sources fail', () => {
  it('serves the last good snapshot and says the fetch failed', () => {
    const feed = stationFeed();
    const response = buildAirResponse(
      input({ feed: { kind: 'last_good', feed, failure: { kind: 'network' } } }),
    );
    expect(response.feed).toEqual({
      fetch: 'failed',
      feedHour: feed.feedHour,
      stale: false,
      problem: 'no_answer',
    });
    expect(response.reading.path).toBe('station');
  });

  it('keeps the plain reasons mid rebuild when a station of the answer is in range', () => {
    const silent: StationRecord = { ...jnuStation(), aqiValue: null, pollutants: [] };
    const feed: StationFeedRead = {
      kind: 'last_good',
      feed: stationFeed([silent]),
      failure: { kind: 'incomplete' },
    };
    expect(buildAirResponse(input({ feed })).reading).toMatchObject({ reason: 'no_station_reading' });
  });

  it('keeps the station reading and drops the curve when the forecast is down', () => {
    const response = buildAirResponse(input({ forecast: err({ kind: 'status', status: 502 }) }));
    expect(response.reading.path).toBe('station');
    expect(response.forecast).toBeNull();
  });

  it('says nothing answered when neither the feed nor the model did', () => {
    const forecast: AirInput['forecast'] = err({ kind: 'timeout' });
    expect(
      buildAirResponse(input({ feed: { kind: 'miss', failure: { kind: 'network' } }, forecast })).reading,
    ).toEqual({
      path: 'unavailable',
      reason: 'feed_and_model_down',
    });
    expect(buildAirResponse(input({ location: FAR_FROM_ALL, forecast })).reading).toEqual({
      path: 'unavailable',
      reason: 'no_station_and_model_down',
    });
  });
});
