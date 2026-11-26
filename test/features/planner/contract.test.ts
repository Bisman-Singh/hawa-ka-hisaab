// Tests for the plan route contract.
import { describe, expect, it } from 'vitest';
import { planRequestSchema, planResponseSchema, planRoute } from '../../../src/features/planner/contract.js';
import { sampleHousehold, samplePlan, sampleTrace } from '../../support/samples.js';

const request = () => ({
  household: sampleHousehold(),
  location: { lat: 28.54, lon: 77.17 },
  language: 'en',
});

describe('planRoute', () => {
  it('is a POST at /api/plan', () => {
    expect(planRoute).toMatchObject({ method: 'POST', path: '/api/plan' });
  });

  it('takes the household, the location and a language', () => {
    expect(planRequestSchema.safeParse(request()).success).toBe(true);
    expect(planRequestSchema.safeParse({ ...request(), language: 'fr' }).success).toBe(false);
  });

  it('never takes air values from the client', () => {
    expect(planRequestSchema.safeParse({ ...request(), aqi: 12 }).success).toBe(false);
  });

  it('answers with the plan, the air it used and the trace', () => {
    const body = {
      plan: samplePlan(),
      airBasis: {
        path: 'station',
        band: 'poor',
        readingHour: '2026-11-24T22:00:00+05:30',
        forecastIssuedAt: null,
      },
      trace: sampleTrace(),
    };
    expect(planResponseSchema.safeParse(body).success).toBe(true);
  });
});
