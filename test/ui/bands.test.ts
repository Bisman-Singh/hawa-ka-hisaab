// Tests for the band table: ranges read from the NAQI facts, the same as the NAQI code's own table, ranges in words
// and the pointer position on the six-cell scale.
import { describe, expect, it } from 'vitest';
import { factNumber } from '../../src/config/facts/index.js';
import { bandForIndex, NAQI_TABLE } from '../../src/features/naqi/table.js';
import { BAND_ORDER, BANDS, factSpan, rangeText, scalePosition } from '../../src/ui/bands.js';

describe('bands', () => {
  it('lists the six CPCB bands mildest first with touching ranges', () => {
    expect(BAND_ORDER).toEqual(['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe']);
    BAND_ORDER.slice(1).forEach((band, index) => {
      const before = BAND_ORDER[index] ?? 'good';
      expect(BANDS[band].lo).toBe(BANDS[before].hi + 1);
    });
    expect(rangeText('very_poor')).toBe('301 to 400');
  });

  it('holds no ranges of its own: each comes from the NAQI band fact and agrees with the NAQI table', () => {
    expect(BANDS.very_poor).toEqual({ lo: 301, hi: 400, hatch: 'g-vpoor' });
    expect(BANDS.severe).toEqual({ lo: 401, hi: 500, hatch: 'g-severe' });
    for (const band of BAND_ORDER) {
      const fact = factNumber(`naqi-band-${band.replace('_', '-')}`);
      expect([BANDS[band].lo, BANDS[band].hi]).toEqual([fact.range?.low, fact.range?.high]);
      expect(bandForIndex(BANDS[band].lo)).toBe(band);
      expect(bandForIndex(BANDS[band].hi)).toBe(band);
    }
    expect(NAQI_TABLE.severeFloor).toBe(BANDS.severe.lo);
  });

  it('reads a number fact with no range as a span of one value', () => {
    expect(factSpan('grap-stage-order')).toEqual({ lo: 2, hi: 2 });
  });

  it('places an AQI inside its band cell, as the design drew 342 and 195', () => {
    expect(scalePosition(342, 'very_poor')).toBeCloseTo(0.735, 3);
    expect(scalePosition(195, 'moderate')).toBeCloseTo(0.49, 3);
    expect(scalePosition(0, 'good')).toBe(0);
    expect(scalePosition(999, 'severe')).toBe(1);
    expect(scalePosition(40, 'poor')).toBe(0.5);
  });
});
