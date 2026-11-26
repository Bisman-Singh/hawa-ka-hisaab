// Tests for the advisory facts and the row helpers that build fact records.
import { describe, expect, it } from 'vitest';
import { COMMUNITY_ADVICE, counted, quoted } from '../../../src/config/facts/community-advice.js';
import { factQuote } from '../../../src/config/facts/index.js';
import { ADVISORY } from '../../../src/config/facts/sources.js';
import { factSchema } from '../../../src/lib/schemas/facts.js';

describe('COMMUNITY_ADVICE', () => {
  it('holds valid facts, all from the health ministry advisory', () => {
    expect(COMMUNITY_ADVICE.filter((fact) => !factSchema.safeParse(fact).success)).toEqual([]);
    expect(COMMUNITY_ADVICE.every((fact) => fact.source === ADVISORY)).toBe(true);
    expect(COMMUNITY_ADVICE).toHaveLength(11);
  });

  it('gives the airing hours as the numbers of the shared quote on airing', () => {
    const hours = COMMUNITY_ADVICE.filter((fact) => fact.id.startsWith('community-ventilation-'));
    expect(hours.map((fact) => (fact.kind === 'number' ? fact.value : null))).toEqual([12, 4]);
    expect(factQuote('advice-ventilate')).toContain('between 12 p.m. to 4 p.m. in afternoon');
  });
});

describe('quoted and counted', () => {
  it('build a text fact and a number fact with or without a range', () => {
    expect(quoted(ADVISORY, ['a-b', 'Title', 'Text'])).toMatchObject({
      kind: 'text',
      lang: 'en',
      text: 'Text',
    });
    expect(counted(ADVISORY, ['a-b', 'Title', 4, 'hour'])).toMatchObject({ kind: 'number', range: null });
    expect(counted(ADVISORY, ['a-b', 'Title', 4, 'hour', { low: 4, high: 5 }])).toMatchObject({
      range: { low: 4, high: 5 },
    });
  });
});
