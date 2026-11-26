// Tests for the travel CO2 factors: the India GHG Program values as the fact sheet lists them.
import { describe, expect, it } from 'vitest';
import { TRAVEL_FACTS } from '../../../src/config/facts/travel.js';

describe('travel CO2 factors', () => {
  it('match the published values', () => {
    const values = Object.fromEntries(
      TRAVEL_FACTS.map((fact) => [fact.id, fact.kind === 'number' ? fact.value : 0]),
    );
    expect(values).toEqual({
      'co2-scooter': 0.0334,
      'co2-motorcycle': 0.029,
      'co2-auto-petrol': 0.1135,
      'co2-auto-cng': 0.10768,
      'co2-car-petrol': 0.13,
      'co2-car-diesel': 0.117,
      'co2-car-cng': 0.063,
      'co2-bus': 0.015161,
      'co2-suburban-rail': 0.007976,
    });
  });
});
