// Tests for distance, coordinate rounding and IST time stamps.
import { describe, expect, it } from 'vitest';
import { distanceKm, istHourStart, istIso, roundLocation } from '../../../src/features/air/geo.js';

describe('distanceKm', () => {
  it('measures great circle distances', () => {
    expect(distanceKm({ lat: 28.6139, lon: 77.209 }, { lat: 19.076, lon: 72.8777 })).toBeCloseTo(1153, -1);
    expect(distanceKm({ lat: 20, lon: 78 }, { lat: 21, lon: 78 })).toBeCloseTo(111.195, 2);
    expect(distanceKm({ lat: 12, lon: 80 }, { lat: 12, lon: 80 })).toBe(0);
  });
});

describe('roundLocation', () => {
  it('rounds to the asked number of decimals', () => {
    expect(roundLocation({ lat: 28.54072, lon: 77.16854 }, 2)).toEqual({ lat: 28.54, lon: 77.17 });
    expect(roundLocation({ lat: 28.54072, lon: 77.16854 }, 1)).toEqual({ lat: 28.5, lon: 77.2 });
  });
});

describe('IST stamps', () => {
  it('writes epoch times in IST with the offset', () => {
    expect(istIso(Date.parse('2026-11-24T16:30:00Z'))).toBe('2026-11-24T22:00:00+05:30');
  });

  it('finds the start of the IST hour, which falls on half past in UTC', () => {
    const start = istHourStart(Date.parse('2026-11-24T22:59:59+05:30'));
    expect(istIso(start)).toBe('2026-11-24T22:00:00+05:30');
    expect(istIso(istHourStart(Date.parse('2026-11-24T22:00:00+05:30')))).toBe('2026-11-24T22:00:00+05:30');
  });
});
