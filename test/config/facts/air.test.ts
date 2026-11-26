// Tests for the air facts: every fact is valid with a public source, ids are unique and the credits exist.
import { describe, expect, it } from 'vitest';
import { AIR_FACTS, CREDIT_DATE_SLOT, dataGovInCredit } from '../../../src/config/facts/air.js';
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
    expect(AIR_FACTS.find((fact) => fact.id === 'data-gov-in-aqi-rule')).toBeUndefined();
    const openMeteo = AIR_FACTS.find((fact) => fact.id === 'credit-open-meteo');
    expect(openMeteo?.kind === 'text' && openMeteo.text).toBe('Weather data by Open-Meteo.com');
    expect(openMeteo?.source.url).toBe('https://open-meteo.com/en/licence');
  });

  it("words the CPCB credit as the app's own statement with the feed link, not as a quotation", () => {
    const cpcb = AIR_FACTS.find((fact) => fact.id === 'credit-cpcb');
    expect(cpcb?.title).toMatch(/app's own words/);
    expect(cpcb?.kind === 'text' && cpcb.text).toContain('https://airquality.cpcb.gov.in/caaqms/rss_feed');
    expect(cpcb?.source.url).toBe('https://airquality.cpcb.gov.in/caaqms/rss_feed');
  });

  it('keeps the data.gov.in credit in the licence template with a date slot that is filled as dd/mm in IST', () => {
    const credit = AIR_FACTS.find((fact) => fact.id === 'credit-data-gov-in');
    expect(credit?.kind === 'text' && credit.text).toContain(
      `Open Government Data Platform India, ${CREDIT_DATE_SLOT}, https://`,
    );
    expect(credit?.source.url).toBe(
      'https://www.data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf',
    );
    expect(dataGovInCredit('2026-11-24T16:30:00Z')).toContain('Platform India, 24/11, https://');
    expect(dataGovInCredit('2026-11-24T19:00:00Z')).toContain('Platform India, 25/11, https://');
    expect(dataGovInCredit('2026-12-31T20:00:00Z')).toContain('Platform India, 01/01, https://');
    expect(dataGovInCredit('2026-11-24T16:30:00Z')).not.toContain('{');
    expect(() => dataGovInCredit('yesterday')).toThrow('not an instant: yesterday');
  });

  it('dates the GRAP stage by its order and lists the NCR districts from the planning board', () => {
    const stage = AIR_FACTS.find((fact) => fact.id === 'grap-stage-order');
    expect(stage).toMatchObject({ kind: 'number', value: 2, unit: 'stage' });
    expect(stage?.source.published).toBe('2026-11-17');
    const ncr = AIR_FACTS.find((fact) => fact.id === 'ncr-districts');
    expect(ncr?.source.url).toBe('https://ncrpb.nic.in/ncrconstituent.html');
    expect(ncr?.title).toMatch(/as on April 2018/);
    expect(ncr?.kind === 'text' && ncr.text).toContain('Rajasthan [...] Haryana:');
  });
});
