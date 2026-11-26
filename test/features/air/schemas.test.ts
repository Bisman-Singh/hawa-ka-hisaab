// Tests that the air contract can express every air card state the product lists.
import { describe, expect, it } from 'vitest';
import { airReadingSchema, feedStatusSchema, grapNoticeSchema } from '../../../src/features/air/schemas.js';
import { hourCurveSchema, locationSchema, placeSchema } from '../../../src/features/air/schemas.js';
import { stationReadingSchema, stationRecordSchema } from '../../../src/features/air/schemas.js';
import { MAX_FORECAST_HOURS } from '../../../src/config/limits.js';
import { hourCurve, jnuStation, rkPuramStation } from '../../support/fake-air.js';
import { sampleSource } from '../../support/samples.js';

const stationReading = (aqi: unknown) => ({
  path: 'station',
  station: jnuStation().station,
  distanceKm: 3.2,
  aqi,
  pollutants: jnuStation().pollutants,
  readingHour: '2026-11-24T22:00:00+05:30',
  stale: false,
  source: sampleSource(),
});

describe('locationSchema and placeSchema', () => {
  it('accepts points in India and refuses points outside it', () => {
    expect(locationSchema.safeParse({ lat: 28.54, lon: 77.17 }).success).toBe(true);
    expect(locationSchema.safeParse({ lat: 51.5, lon: -0.12 }).success).toBe(false);
  });

  it('accepts a place with a PIN code and refuses extra fields', () => {
    const place = {
      id: '1273294',
      name: 'Delhi',
      district: null,
      state: 'Delhi',
      postcode: '110001',
      lat: 28.65,
      lon: 77.23,
    };
    expect(placeSchema.safeParse(place).success).toBe(true);
    expect(placeSchema.safeParse({ ...place, population: 1 }).success).toBe(false);
  });
});

describe('station path', () => {
  it('accepts the records built from the fixture stations', () => {
    expect(stationRecordSchema.safeParse(jnuStation()).success).toBe(true);
    expect(stationRecordSchema.safeParse(rkPuramStation()).success).toBe(true);
  });

  it('shows CPCB AQI and band, or a null AQI when CPCB published none', () => {
    expect(
      stationReadingSchema.safeParse(stationReading({ value: 246, band: 'poor', predominant: 'pm25' }))
        .success,
    ).toBe(true);
    expect(stationReadingSchema.safeParse(stationReading(null)).success).toBe(true);
  });

  it('refuses a station beyond the 50 km radius', () => {
    expect(stationReadingSchema.safeParse({ ...stationReading(null), distanceKm: 50.1 }).success).toBe(false);
  });
});

describe('airReadingSchema', () => {
  it('accepts the modelled path with an estimate and the nearest station distance', () => {
    const modelled = {
      path: 'modelled',
      reason: 'no_station_in_range',
      estimate: { status: 'insufficient', reason: 'too_few_pollutants', available: ['pm25'] },
      modelHour: '2026-11-24T22:00:00+05:30',
      nearestStationKm: 212.4,
      source: sampleSource(),
    };
    expect(airReadingSchema.safeParse(modelled).success).toBe(true);
    for (const reason of ['no_station_reading', 'feed_unavailable']) {
      expect(airReadingSchema.safeParse({ ...modelled, reason }).success).toBe(true);
    }
    expect(airReadingSchema.safeParse({ ...modelled, reason: 'preferred' }).success).toBe(false);
  });

  it('accepts the state where neither source answered', () => {
    expect(airReadingSchema.safeParse({ path: 'unavailable', reason: 'feed_and_model_down' }).success).toBe(
      true,
    );
    expect(airReadingSchema.safeParse({ path: 'live' }).success).toBe(false);
  });
});

describe('feedStatusSchema', () => {
  it('expresses live, stale, down with a snapshot and down with nothing cached', () => {
    const hour = '2026-11-24T22:00:00+05:30';
    for (const status of [
      { fetch: 'ok', feedHour: hour, stale: false },
      { fetch: 'ok', feedHour: hour, stale: true },
      { fetch: 'failed', feedHour: hour, stale: false },
      { fetch: 'failed', feedHour: null, stale: false },
    ]) {
      expect(feedStatusSchema.safeParse(status).success).toBe(true);
    }
  });
});

describe('forecast and GRAP', () => {
  it('accepts a forecast curve labelled as a model forecast', () => {
    expect(hourCurveSchema.safeParse(hourCurve([90, 120, 60])).success).toBe(true);
    expect(hourCurveSchema.safeParse({ ...hourCurve([90]), kind: 'measurement' }).success).toBe(false);
    expect(
      hourCurveSchema.safeParse(hourCurve(Array.from({ length: MAX_FORECAST_HOURS }, () => 50))).success,
    ).toBe(true);
    expect(
      hourCurveSchema.safeParse(hourCurve(Array.from({ length: MAX_FORECAST_HOURS + 1 }, () => 50))).success,
    ).toBe(false);
  });

  it('accepts a GRAP notice for Delhi NCR only', () => {
    const notice = { region: 'delhi_ncr', stage: 'II', orderDate: '2026-11-17', factId: 'grap-order' };
    expect(grapNoticeSchema.safeParse(notice).success).toBe(true);
    expect(grapNoticeSchema.safeParse({ ...notice, region: 'mumbai' }).success).toBe(false);
  });
});
