// Tests for the place search request and the mapping of its results, shaped like live answers of 26 Nov 2026.
import { describe, expect, it } from 'vitest';
import { geocodingSchema, geocodingUrl, MAX_PLACES, toPlaces } from '../../../src/features/air/places.js';
import { sampleSearchResult } from '../../support/open-meteo-samples.js';

const MUZAFFARPUR = sampleSearchResult();

describe('geocodingUrl', () => {
  it('searches in India only, in English, for at most ten places', () => {
    const url = new URL(geocodingUrl('Tawang'));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      name: 'Tawang',
      count: String(MAX_PLACES),
      language: 'en',
      format: 'json',
      countryCode: 'IN',
    });
  });
});

describe('toPlaces', () => {
  it('maps a town with what was understood', () => {
    expect(toPlaces(geocodingSchema.parse({ results: [MUZAFFARPUR], generationtime_ms: 0.4 }))).toEqual([
      {
        id: 'place-1262330',
        name: 'Muzaffarpur',
        district: 'Muzaffarpur district',
        state: 'Bihar',
        postcode: null,
        lat: 26.12259,
        lon: 85.39055,
        resolution: 'search',
        label: 'Muzaffarpur, Muzaffarpur district, Bihar',
        roughness: null,
      },
    ]);
  });

  it('reads an answer with no results key as not found', () => {
    expect(toPlaces(geocodingSchema.parse({ generationtime_ms: 0.6 }))).toEqual([]);
  });

  it('drops results outside India, of another country or of the wrong shape, and keeps a postcode', () => {
    const sparse = {
      id: 7,
      name: 'Ri',
      latitude: 31.2,
      longitude: 76.7,
      country_code: 'IN',
      postcodes: ['174101'],
    };
    const answer = geocodingSchema.parse({
      results: [
        { ...MUZAFFARPUR, country_code: 'NP' },
        { ...MUZAFFARPUR, latitude: 40 },
        { name: 'x' },
        sparse,
      ],
    });
    expect(toPlaces(answer)).toEqual([
      expect.objectContaining({ name: 'Ri', district: null, state: null, postcode: '174101', label: 'Ri' }),
    ]);
  });

  it('returns at most ten places', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ ...MUZAFFARPUR, id: index }));
    expect(toPlaces(geocodingSchema.parse({ results: many }))).toHaveLength(MAX_PLACES);
  });
});
