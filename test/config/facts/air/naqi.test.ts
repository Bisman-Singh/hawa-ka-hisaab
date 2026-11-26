// Tests for the NAQI facts: six bands with verbatim health statements, seven pollutants and the CPCB rules.
import { describe, expect, it } from 'vitest';
import { NAQI_FACTS } from '../../../../src/config/facts/air/naqi.js';

const byId = (id: string) => NAQI_FACTS.find((fact) => fact.id === id);

describe('NAQI_FACTS', () => {
  it('has a range, a health statement and seven breakpoints for each of six bands, and five rules', () => {
    expect(NAQI_FACTS).toHaveLength(6 + 6 + 42 + 5);
    expect(byId('naqi-band-very-poor')).toMatchObject({
      title: 'Very Poor',
      value: 301,
      range: { low: 301, high: 400 },
    });
    expect(byId('naqi-health-good')).toMatchObject({ kind: 'text', text: 'Minimal Impact' });
  });

  it('stores each printed cell and an open Severe row above the Very poor top', () => {
    expect(byId('naqi-pm25-satisfactory')).toMatchObject({
      value: 31,
      range: { low: 31, high: 60 },
      unit: 'µg/m³',
    });
    expect(byId('naqi-co-poor')).toMatchObject({
      value: 10.1,
      range: { low: 10.1, high: 17 },
      unit: 'mg/m³',
    });
    expect(byId('naqi-pm25-severe')).toMatchObject({
      title: 'PM2.5 24 hour mean for Severe, above 250',
      value: 250,
      range: null,
    });
    expect(byId('naqi-o3-good')?.title).toBe('O3 8 hour mean for Good');
  });

  it('quotes the worked example from the one page summary and the formula from the report', () => {
    expect(byId('naqi-worked-example')?.source.title).toBe('About National Air Quality Index');
    expect(byId('naqi-formula')?.source.title).toMatch(/final report/);
  });
});
