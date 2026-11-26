// Tests for facts, sources and the labelled numbers sent to the model.
import { describe, expect, it } from 'vitest';
import { factIdSchema, factSchema, factValueSchema, sourceSchema } from '../../../src/lib/schemas/facts.js';
import { sampleSource } from '../../support/samples.js';

describe('factIdSchema', () => {
  it('accepts lower case kebab ids and refuses others', () => {
    expect(factIdSchema.safeParse('co2-car-petrol').success).toBe(true);
    for (const id of ['CO2-car', 'co2_car', '-co2', 'co2--car', '']) {
      expect(factIdSchema.safeParse(id).success).toBe(false);
    }
  });
});

describe('sourceSchema', () => {
  it('accepts a public https source', () => {
    expect(sourceSchema.safeParse(sampleSource()).success).toBe(true);
  });

  it('refuses a source without https or with a bad retrieval date', () => {
    expect(sourceSchema.safeParse({ ...sampleSource(), url: 'http://airquality.cpcb.gov.in' }).success).toBe(
      false,
    );
    expect(sourceSchema.safeParse({ ...sampleSource(), url: 'javascript:alert(1)' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...sampleSource(), retrieved: 'Nov 2026' }).success).toBe(false);
  });
});

describe('factSchema', () => {
  it('accepts a number fact with a range and a quoted text fact', () => {
    const number = {
      kind: 'number',
      id: 'test-ratio',
      title: 'A ratio',
      value: 1.2,
      range: { low: 1, high: 1.5 },
      unit: '',
      source: sampleSource(),
    };
    const text = {
      kind: 'text',
      id: 'test-advice',
      title: 'Advice',
      text: 'Stay indoors.',
      lang: 'en',
      source: sampleSource(),
    };
    expect(factSchema.safeParse(number).success).toBe(true);
    expect(factSchema.safeParse(text).success).toBe(true);
  });

  it('refuses a fact without a source', () => {
    expect(factSchema.safeParse({ kind: 'text', id: 'x', title: 'T', text: 'S', lang: 'en' }).success).toBe(
      false,
    );
  });
});

describe('factValueSchema', () => {
  it('accepts a labelled number', () => {
    expect(factValueSchema.safeParse({ id: 'aqi-now', label: 'AQI', value: 246, unit: '' }).success).toBe(
      true,
    );
  });
});
