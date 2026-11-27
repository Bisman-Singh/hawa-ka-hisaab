// Tests for the sources list and the dated data.gov.in credit.
import { describe, expect, it } from 'vitest';
import { FACT_LIST, factQuote } from '../../../src/config/facts/index.js';
import { citedSources, dataGovCredit, dayMonth } from '../../../src/ui/legal/sources.js';

describe('citedSources', () => {
  it('lists every cited source once, by address', () => {
    const sources = citedSources();
    const urls = sources.map((source) => source.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(new Set(FACT_LIST.map((fact) => fact.source.url))).toEqual(new Set(urls));
  });
});

describe('dataGovCredit', () => {
  it('fills the date slot of the registry credit with the day and month in India', () => {
    expect(dayMonth('2026-11-24T20:00:00Z')).toBe('25/11');
    expect(dayMonth('2026-01-05T00:00:00+05:30')).toBe('05/01');
    const credit = dataGovCredit('2026-11-24T10:00:00Z');
    expect(credit).toBe(factQuote('credit-data-gov-in').replace('{dd/mm}', '24/11'));
    expect(credit).not.toContain('{');
  });
});
