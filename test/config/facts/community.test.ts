// Tests for the community fact table: valid facts with public sources, unique ids and known answers.
import { describe, expect, it } from 'vitest';
import { COMMUNITY_FACTS } from '../../../src/config/facts/community.js';
import { factSchema, factValueSchema } from '../../../src/lib/schemas/facts.js';

const byId = (id: string) => COMMUNITY_FACTS.find((fact) => fact.id === id);

describe('COMMUNITY_FACTS', () => {
  it('holds only valid facts with https sources and unique ids under one prefix', () => {
    expect(COMMUNITY_FACTS.filter((fact) => !factSchema.safeParse(fact).success)).toEqual([]);
    const ids = COMMUNITY_FACTS.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !id.startsWith('community-'))).toEqual([]);
  });

  it('gives every number fact a title that can label a fact value, with no digit where figures show it', () => {
    const numbers = COMMUNITY_FACTS.filter((fact) => fact.kind === 'number');
    expect(numbers.filter((fact) => fact.title.length > 120)).toEqual([]);
    const shownInFigures = numbers.filter((fact) => /^community-(share|study)-/.test(fact.id));
    expect(shownInFigures.map((fact) => fact.title).filter((title) => /\d/.test(title))).toEqual([]);
    expect(shownInFigures).toHaveLength(4);
    const asValues = numbers.map((fact) => ({
      id: fact.id,
      label: fact.title,
      value: fact.value,
      unit: fact.unit,
    }));
    expect(asValues.filter((value) => !factValueSchema.safeParse(value).success)).toEqual([]);
  });

  it('quotes the health ministry advice for every band and both groups', () => {
    for (const band of ['good', 'satisfactory', 'moderate', 'poor', 'very-poor', 'severe']) {
      expect(byId(`community-advice-${band}-general`)?.kind).toBe('text');
      expect(byId(`community-advice-${band}-vulnerable`)?.kind).toBe('text');
    }
    expect(byId('community-advice-very-poor-vulnerable')).toMatchObject({
      text: 'Remain indoors and keep activity levels low',
    });
  });

  it('matches the cited sources on the Delhi winter shares and the ventilation window', () => {
    const values = ['dg-sets', 'refuse-burning', 'transport'].map((name) => byId(`community-share-${name}`));
    expect(values.map((fact) => (fact?.kind === 'number' ? fact.value : null))).toEqual([5, 3, 28]);
    expect(byId('community-study-winter')).toMatchObject({ value: 2016, unit: 'year' });
    expect(byId('community-ventilation-from')).toMatchObject({ value: 12 });
    expect(byId('community-ventilation-until')).toMatchObject({ value: 4 });
    expect(byId('community-mask-n95-filtration')).toMatchObject({ range: { low: 97, high: 98 } });
  });

  it('carries no mass or concentration unit in any number fact', () => {
    const units = COMMUNITY_FACTS.flatMap((fact) => (fact.kind === 'number' ? [fact.unit] : []));
    expect(units.filter((unit) => /g\b|g\/|tonne|ppm|m3|m³/i.test(unit))).toEqual([]);
  });
});
