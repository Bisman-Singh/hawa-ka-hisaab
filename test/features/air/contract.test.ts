// Tests for the places and air route contracts.
import { describe, expect, it } from 'vitest';
import { airQuerySchema, airResponseSchema, airRoute } from '../../../src/features/air/contract.js';
import { placesQuerySchema, placesResponseSchema, placesRoute } from '../../../src/features/air/contract.js';
import { hourCurve } from '../../support/fake-air.js';

describe('placesRoute', () => {
  it('is a cached GET at /api/places', () => {
    expect(placesRoute).toMatchObject({
      method: 'GET',
      path: '/api/places',
      cacheSeconds: 86_400,
    });
  });

  it('takes a trimmed query of two to eighty characters', () => {
    expect(placesQuerySchema.parse({ q: ' 110001 ' })).toEqual({ q: '110001' });
    expect(placesQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(placesQuerySchema.safeParse({ q: 'x'.repeat(81) }).success).toBe(false);
  });

  it('answers with a list, empty when nothing matched', () => {
    expect(placesResponseSchema.safeParse({ places: [] }).success).toBe(true);
  });
});

describe('airRoute', () => {
  it('is a briefly cached GET at /api/air', () => {
    expect(airRoute).toMatchObject({
      method: 'GET',
      path: '/api/air',
      cacheSeconds: 300,
    });
  });

  it('coerces the query strings to numbers inside India', () => {
    expect(airQuerySchema.parse({ lat: '28.54', lon: '77.17' })).toEqual({ lat: 28.54, lon: 77.17 });
    expect(airQuerySchema.safeParse({ lat: 'abc', lon: '77' }).success).toBe(false);
    expect(airQuerySchema.safeParse({ lat: '40.7', lon: '-74' }).success).toBe(false);
  });

  it('takes coordinates rounded to two decimals, so an exact home location never sits in a URL', () => {
    expect(airQuerySchema.safeParse({ lat: '28.5', lon: '77' }).success).toBe(true);
    expect(airQuerySchema.parse({ lat: '28.56', lon: '77.18' })).toEqual({ lat: 28.56, lon: 77.18 });
    const exact = airQuerySchema.safeParse({ lat: '28.540721', lon: '77.168544' });
    expect(exact.error?.issues.map((issue) => issue.message)).toEqual([
      'round to two decimals',
      'round to two decimals',
    ]);
  });

  it('answers with the reading, the feed state, the curve and GRAP', () => {
    const body = {
      reading: { path: 'unavailable', reason: 'no_station_and_model_down' },
      feed: { fetch: 'failed', feedHour: null, stale: false },
      forecast: hourCurve([80]),
      grap: null,
    };
    expect(airResponseSchema.safeParse(body).success).toBe(true);
    expect(airResponseSchema.safeParse({ ...body, forecast: undefined }).success).toBe(false);
  });
});
