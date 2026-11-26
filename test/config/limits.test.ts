// Tests for the shared limits.
import { describe, expect, it } from 'vitest';
import { FEED_STALE_AFTER_MINUTES, INDIA_BOUNDS, MAX_BODY_BYTES } from '../../src/config/limits.js';
import { MIN_MODEL_CALL_MS, MIN_RETRY_MS, ROUTE_DEADLINE_MS } from '../../src/config/limits.js';
import {
  MAX_INTAKE_TEXT_CHARS,
  MAX_QUESTION_CHARS,
  SLOT_START_HOURS,
  STATION_RADIUS_KM,
} from '../../src/config/limits.js';

const inIndia = (lat: number, lon: number) =>
  lat >= INDIA_BOUNDS.minLat &&
  lat <= INDIA_BOUNDS.maxLat &&
  lon >= INDIA_BOUNDS.minLon &&
  lon <= INDIA_BOUNDS.maxLon;

describe('limits', () => {
  it('uses the stale and radius rules the product states', () => {
    expect(FEED_STALE_AFTER_MINUTES).toBe(180);
    expect(STATION_RADIUS_KM).toBe(50);
  });

  it('covers the far corners of India in the bounding box', () => {
    const corners: [number, number][] = [
      [34.16, 77.58],
      [6.75, 93.84],
      [8.08, 77.55],
      [23.24, 68.75],
      [27.95, 96.97],
      [11.62, 92.72],
    ];
    for (const [lat, lon] of corners) {
      expect(inIndia(lat, lon)).toBe(true);
    }
  });

  it('keeps a model route well inside the 30 second function limit, with a retry only when time allows', () => {
    expect(ROUTE_DEADLINE_MS).toBeLessThanOrEqual(20_000);
    expect(MIN_MODEL_CALL_MS).toBeLessThan(MIN_RETRY_MS);
    expect(MIN_RETRY_MS).toBeLessThan(ROUTE_DEADLINE_MS);
  });

  it('keeps text fields well inside the body limit', () => {
    expect(MAX_INTAKE_TEXT_CHARS * 4).toBeLessThan(MAX_BODY_BYTES);
    expect(MAX_QUESTION_CHARS).toBeLessThan(MAX_INTAKE_TEXT_CHARS);
  });

  it('starts the morning, afternoon and evening slots in order within one day', () => {
    expect(SLOT_START_HOURS.morning).toBeLessThan(SLOT_START_HOURS.afternoon);
    expect(SLOT_START_HOURS.afternoon).toBeLessThan(SLOT_START_HOURS.evening);
    expect(SLOT_START_HOURS.evening).toBeLessThan(24);
  });
});
