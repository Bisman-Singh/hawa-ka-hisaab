// Tests for the air facts: every fact is valid with a public source, ids are unique and the credits exist.
import { describe, expect, it } from 'vitest';
import { AIR_FACTS } from '../../../src/config/facts/air.js';
import { factSchema } from '../../../src/lib/schemas/facts.js';

describe('AIR_FACTS', () => {
  it('holds only valid facts with unique ids', () => {
    for (const fact of AIR_FACTS) {
      expect(factSchema.safeParse(fact).success, fact.id).toBe(true);
    }
    const ids = AIR_FACTS.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('credits CPCB, data.gov.in under GODL, Open-Meteo, CAMS and GeoNames', () => {
    const credits = AIR_FACTS.filter((fact) => fact.id.startsWith('credit-')).map((fact) => fact.id);
    expect(credits).toEqual([
      'credit-cpcb',
      'credit-data-gov-in',
      'credit-open-meteo',
      'credit-cams',
      'credit-geonames',
    ]);
    const rule = AIR_FACTS.find((fact) => fact.id === 'data-gov-in-aqi-rule');
    expect(rule?.kind === 'text' && rule.text).toBe(
      "CPCB sub-indices via data.gov.in. AQI is the highest sub-index, CPCB's own rule.",
    );
    const openMeteo = AIR_FACTS.find((fact) => fact.id === 'credit-open-meteo');
    expect(openMeteo?.kind === 'text' && openMeteo.text).toBe('Weather data by Open-Meteo.com');
  });

  it('dates the GRAP stage by its order and lists the NCR districts from the planning board', () => {
    const stage = AIR_FACTS.find((fact) => fact.id === 'grap-stage-order');
    expect(stage).toMatchObject({ kind: 'number', value: 2, unit: 'stage' });
    expect(stage?.source.published).toBe('2026-11-17');
    const ncr = AIR_FACTS.find((fact) => fact.id === 'ncr-districts');
    expect(ncr?.source.url).toBe('https://ncrpb.nic.in/ncrconstituent.html');
  });
});
