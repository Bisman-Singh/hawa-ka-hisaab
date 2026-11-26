// Tests for filling templates and recording the facts behind the numbers shown.
import { describe, expect, it } from 'vitest';
import { createRenderer, uniqueFacts } from '../../../src/features/community/render.js';

const AQI = { id: 'air-aqi', label: 'AQI', value: 312, unit: 'AQI' };

describe('createRenderer', () => {
  it('fills placeholders per language and records only the facts of values it used', () => {
    const renderer = createRenderer({
      aqi: { en: '312', hi: '312', facts: [AQI] },
      band: { en: 'Very Poor', hi: 'बहुत खराब', facts: [] },
      unused: { en: '9', hi: '9', facts: [{ id: 'input-homes', label: 'homes', value: 9, unit: 'homes' }] },
    });
    expect(renderer.fill('AQI {aqi}, {band}', 'en')).toBe('AQI 312, Very Poor');
    expect(renderer.fill('{band} हवा, AQI {aqi}', 'hi')).toBe('बहुत खराब हवा, AQI 312');
    expect(renderer.factSet()).toEqual([AQI]);
  });

  it('leaves a placeholder with no value as written', () => {
    expect(createRenderer({}).fill('between {winStart} and noon', 'en')).toBe('between {winStart} and noon');
  });
});

describe('uniqueFacts', () => {
  it('drops a repeat of the same id and value and keeps the same id with another value', () => {
    const minute = { ...AQI, value: 0 };
    expect(uniqueFacts([AQI, AQI, minute])).toEqual([AQI, minute]);
  });
});
