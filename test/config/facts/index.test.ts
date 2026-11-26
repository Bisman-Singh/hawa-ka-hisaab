// Tests for the fact registry: every fact is well formed and sourced, lookups work, and banned numbers are absent.
import { describe, expect, it } from 'vitest';
import { FACT_LIST, factEnds, factNumber, factQuote, findFact } from '../../../src/config/facts/index.js';
import { factSchema } from '../../../src/lib/schemas/facts.js';

describe('the fact registry', () => {
  it('holds valid facts with unique ids, https sources and titles short enough to label a sent number', () => {
    expect(FACT_LIST.filter((fact) => !factSchema.safeParse(fact).success)).toEqual([]);
    expect(new Set(FACT_LIST.map((fact) => fact.id)).size).toBe(FACT_LIST.length);
    expect(FACT_LIST.every((fact) => fact.source.url.startsWith('https://'))).toBe(true);
    expect(FACT_LIST.filter((fact) => fact.title.length > 120).map((fact) => fact.id)).toEqual([]);
  });

  it('holds the air, community and emergency facts too, and quotes no passage twice except band advice', () => {
    for (const id of ['grap-stage-order', 'community-share-dg-sets', 'india-emergency-number']) {
      expect(findFact(id)?.id).toBe(id);
    }
    const quoted = FACT_LIST.flatMap((fact) => (fact.kind === 'text' ? [fact] : []));
    const keys = quoted.map((fact) => `${fact.source.url} ${fact.text}`);
    const repeats = quoted.filter((_, index) => keys.indexOf(keys[index] ?? '') !== index);
    expect(repeats.filter((fact) => !/^advice-[a-z-]+-(general|vulnerable)$/.test(fact.id))).toEqual([]);
  });

  it('keeps ranges as ranges, with the value at the low end', () => {
    for (const fact of FACT_LIST) {
      if (fact.kind === 'number' && fact.range) {
        expect(fact.value).toBe(fact.range.low);
      }
    }
  });

  it('carries no metro or electric vehicle CO2, no indoor to outdoor ratio and no dose total', () => {
    const banned = FACT_LIST.filter((fact) =>
      /metro|electric|\bev\b|indoor.to.outdoor|i\/o ratio|dose|pm added/i.test(
        `${fact.id} ${fact.title} ${fact.kind === 'number' ? fact.unit : ''}`,
      ),
    ).filter((fact) => fact.kind === 'number' && !fact.id.startsWith('exposure-ratio-metro'));
    expect(banned).toEqual([]);
    const co2 = FACT_LIST.filter((fact) => fact.kind === 'number' && fact.unit.includes('CO2'));
    expect(co2.map((fact) => fact.id).filter((id) => /metro|electric/.test(id))).toEqual([]);
  });
});

describe('lookups', () => {
  it('finds a fact by id and gives null for an unknown id', () => {
    expect(findFact('co2-bus')?.kind).toBe('number');
    expect(findFact('no-such-fact')).toBeNull();
  });

  it('gives a number fact value and range, and throws for a missing or quoted id', () => {
    expect(factNumber('coil-cigarettes')).toEqual({ value: 75, range: { low: 75, high: 137 } });
    expect(factNumber('co2-bus')).toEqual({ value: 0.015161, range: null });
    expect(() => factNumber('advice-masks')).toThrow('no number fact advice-masks');
    expect(() => factNumber('no-such-fact')).toThrow('no number fact');
  });

  it('gives the ends of a range, or the single value', () => {
    expect(factEnds('mask-leakage')).toEqual([0.03, 0.68]);
    expect(factEnds('co2-bus')).toEqual([0.015161]);
  });

  it('gives a quoted fact text, and throws for a missing or number id', () => {
    expect(factQuote('advice-wet-mopping')).toMatch(/^Practice wet mopping instead of sweeping/);
    expect(() => factQuote('co2-bus')).toThrow('no quoted fact co2-bus');
  });
});
