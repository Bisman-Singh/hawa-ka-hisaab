// Tests for GRAP: shown only for points in Delhi NCR, with the stage and date of the CAQM order in the facts.
import { describe, expect, it } from 'vitest';
import { GRAP_NOTICE, grapNoticeAt, isNcrDistrict, nearNcr } from '../../../src/features/air/grap.js';
import { samplePinTables } from '../../support/fake-air-sources.js';

const tables = samplePinTables();

describe('GRAP_NOTICE', () => {
  it('carries the stage and the date of the order, not a claim about today', () => {
    expect(GRAP_NOTICE).toEqual({
      region: 'delhi_ncr',
      stage: 'II',
      orderDate: '2026-11-17',
      factId: 'grap-stage-order',
    });
  });
});

describe('isNcrDistrict', () => {
  it('counts all of Delhi and the listed districts by their GeoNames names', () => {
    expect(isNcrDistrict(['East Delhi', 'Delhi'])).toBe(true);
    expect(isNcrDistrict(['Gurgaon', 'Haryana'])).toBe(true);
    expect(isNcrDistrict(['Alwar', 'Rajasthan'])).toBe(true);
    expect(isNcrDistrict(['Gautam Buddha Nagar', 'Uttar Pradesh'])).toBe(true);
  });

  it('leaves out other districts of the NCR states and other states', () => {
    expect(isNcrDistrict(['Agra', 'Uttar Pradesh'])).toBe(false);
    expect(isNcrDistrict(['Ambala', 'Haryana'])).toBe(false);
    expect(isNcrDistrict(['Mumbai', 'Maharashtra'])).toBe(false);
  });
});

describe('grapNoticeAt', () => {
  it('gives the notice in Delhi, Gurugram and Alwar', () => {
    expect(grapNoticeAt(tables, { lat: 28.63, lon: 77.22 })).toEqual(GRAP_NOTICE);
    expect(grapNoticeAt(tables, { lat: 28.46, lon: 77.03 })).toEqual(GRAP_NOTICE);
    expect(grapNoticeAt(tables, { lat: 27.55, lon: 76.6 })).toEqual(GRAP_NOTICE);
  });

  it('gives nothing in Agra, which is inside the box but not in NCR', () => {
    expect(nearNcr({ lat: 27.18, lon: 78.02 })).toBe(true);
    expect(grapNoticeAt(tables, { lat: 27.18, lon: 78.02 })).toBeNull();
  });

  it('gives nothing outside the box or far from any PIN centre', () => {
    expect(nearNcr({ lat: 19.07, lon: 72.88 })).toBe(false);
    expect(grapNoticeAt(tables, { lat: 19.07, lon: 72.88 })).toBeNull();
    expect(grapNoticeAt(tables, { lat: 29.9, lon: 75.4 })).toBeNull();
  });
});
