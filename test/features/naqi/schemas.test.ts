// Tests for the NAQI vocabulary and the modelled estimate.
import { describe, expect, it } from 'vitest';
import { aqiBandSchema, naqiEstimateSchema, pollutantIdSchema } from '../../../src/features/naqi/schemas.js';

const subIndex = (pollutant: string, averagingHours: number) => ({
  pollutant,
  subIndex: 120,
  meanConcentration: 80,
  unit: pollutant === 'co' ? 'mg_m3' : 'ug_m3',
  averagingHours,
});

describe('NAQI vocabulary', () => {
  it('names the seven index pollutants and the six bands mildest first', () => {
    expect(pollutantIdSchema.options).toEqual(['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3']);
    expect(aqiBandSchema.options).toEqual([
      'good',
      'satisfactory',
      'moderate',
      'poor',
      'very_poor',
      'severe',
    ]);
  });
});

describe('naqiEstimateSchema', () => {
  it('accepts a computed estimate from at least three sub-indices', () => {
    const estimate = {
      status: 'computed',
      value: 120,
      band: 'moderate',
      predominant: 'pm25',
      subIndices: [subIndex('pm25', 24), subIndex('no2', 24), subIndex('co', 8)],
    };
    expect(naqiEstimateSchema.safeParse(estimate).success).toBe(true);
    expect(
      naqiEstimateSchema.safeParse({ ...estimate, subIndices: estimate.subIndices.slice(0, 2) }).success,
    ).toBe(false);
  });

  it('refuses averaging periods other than 8 and 24 hours', () => {
    const estimate = {
      status: 'computed',
      value: 1,
      band: 'good',
      predominant: 'pm25',
      subIndices: [subIndex('pm25', 1), subIndex('no2', 24), subIndex('co', 8)],
    };
    expect(naqiEstimateSchema.safeParse(estimate).success).toBe(false);
  });

  it('can say why no estimate was possible', () => {
    const insufficient = { status: 'insufficient', reason: 'no_particulate', available: ['no2', 'o3', 'co'] };
    expect(naqiEstimateSchema.safeParse(insufficient).success).toBe(true);
  });
});
