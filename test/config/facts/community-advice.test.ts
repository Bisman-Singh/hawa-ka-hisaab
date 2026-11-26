// Tests for the advisory facts and the row helpers that build fact records.
import { describe, expect, it } from 'vitest';
import { COMMUNITY_ADVICE, counted, MOHFW, quoted } from '../../../src/config/facts/community-advice.js';
import { factSchema } from '../../../src/lib/schemas/facts.js';

describe('COMMUNITY_ADVICE', () => {
  it('holds valid facts, all from the health ministry advisory', () => {
    expect(COMMUNITY_ADVICE.filter((fact) => !factSchema.safeParse(fact).success)).toEqual([]);
    expect(COMMUNITY_ADVICE.every((fact) => fact.source === MOHFW)).toBe(true);
    expect(COMMUNITY_ADVICE).toHaveLength(26);
  });

  it('quotes the ventilation window as the advisory writes it', () => {
    const window = COMMUNITY_ADVICE.find((fact) => fact.id === 'community-advice-ventilation');
    expect(window?.kind === 'text' && window.text).toContain('between 12 p.m. to 4 p.m. in afternoon');
  });
});

describe('quoted and counted', () => {
  it('build a text fact and a number fact with or without a range', () => {
    expect(quoted(MOHFW, ['a-b', 'Title', 'Text'])).toMatchObject({ kind: 'text', lang: 'en', text: 'Text' });
    expect(counted(MOHFW, ['a-b', 'Title', 4, 'hour'])).toMatchObject({ kind: 'number', range: null });
    expect(counted(MOHFW, ['a-b', 'Title', 4, 'hour', { low: 4, high: 5 }])).toMatchObject({
      range: { low: 4, high: 5 },
    });
  });
});
