// Tests for the band table: ranges in words and the pointer position on the six-cell scale.
import { describe, expect, it } from 'vitest';
import { BAND_ORDER, BANDS, rangeText, scalePosition } from '../../src/ui/bands.js';

describe('bands', () => {
  it('lists the six CPCB bands mildest first with touching ranges', () => {
    expect(BAND_ORDER).toEqual(['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe']);
    BAND_ORDER.slice(1).forEach((band, index) => {
      const before = BAND_ORDER[index] ?? 'good';
      expect(BANDS[band].lo).toBe(BANDS[before].hi + 1);
    });
    expect(rangeText('very_poor')).toBe('301 to 400');
  });

  it('places an AQI inside its band cell, as the design drew 342 and 195', () => {
    expect(scalePosition(342, 'very_poor')).toBeCloseTo(0.735, 3);
    expect(scalePosition(195, 'moderate')).toBeCloseTo(0.49, 3);
    expect(scalePosition(0, 'good')).toBe(0);
    expect(scalePosition(999, 'severe')).toBe(1);
    expect(scalePosition(40, 'poor')).toBe(0.5);
  });
});
