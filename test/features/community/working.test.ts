// Tests for the working behind computed facts: entered, forecast and cited terms, and the built figure.
import { describe, expect, it } from 'vitest';
import { buildFigure, cited, entered, forecastHour } from '../../../src/features/community/working.js';

describe('terms', () => {
  it('mark where each number came from', () => {
    expect(entered('input-homes', ['homes', 'homes'], 120).input).toEqual({
      label: 'homes',
      value: 120,
      unit: 'homes',
      from: 'household',
      factId: null,
    });
    expect(forecastHour('cleaner window starts', 13).fact).toMatchObject({
      id: 'forecast-cleaner-window',
      value: 13,
    });
    expect(cited('community-share-dg-sets').input).toMatchObject({
      value: 5,
      from: 'fact',
      factId: 'community-share-dg-sets',
    });
  });
});

describe('buildFigure', () => {
  it('rounds the value as the notice writes it and lists its fact values', () => {
    const built = buildFigure({
      id: 'computed-idling-vehicle-minutes',
      label: 'Engine running time at the gate',
      value: 0.25 * 3,
      unit: 'vehicle-minutes a day',
      formula: 'Vehicles a day times minutes each.',
      terms: [entered('input-gate-vehicles', ['vehicles a day', 'vehicles'], 3)],
      factIds: ['community-share-transport'],
    });
    expect(built.figure.value).toBe(0.8);
    expect(built.facts.map((fact) => [fact.id, fact.value])).toEqual([
      ['computed-idling-vehicle-minutes', 0.8],
      ['input-gate-vehicles', 3],
    ]);
  });
});
