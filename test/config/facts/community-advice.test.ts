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
    expect(COMMUNITY_ADVICE).toHaveLength(12);
  });

  it('gives the airing hours as the numbers of the shared quote on airing', () => {
    const hours = COMMUNITY_ADVICE.filter((fact) => fact.id.startsWith('community-ventilation-'));
    expect(hours.map((fact) => (fact.kind === 'number' ? fact.value : null))).toEqual([12, 4]);
    expect(factQuote('advice-ventilate')).toContain('between 12 p.m. to 4 p.m. in afternoon');
  });

  it('models the two mask classes the advisory names as two values, not a range', () => {
    const classes = COMMUNITY_ADVICE.filter((fact) => fact.id.startsWith('community-mask-class'));
    expect(
      classes.map((fact) => [fact.id, fact.kind === 'number' ? [fact.value, fact.range] : null]),
    ).toEqual([
      ['community-mask-class-n95', [95, null]],
      ['community-mask-class-n99', [99, null]],
    ]);
    expect(COMMUNITY_ADVICE.some((fact) => fact.id === 'community-mask-class')).toBe(false);
  });

  it('quotes the school gate item to its end and marks every cut', () => {
    const gates = COMMUNITY_ADVICE.find((fact) => fact.id === 'community-advice-school-gates');
    expect(gates?.kind === 'text' && gates.text).toBe(
      'Sites for precautions - transit from home to school, near school gates, and outdooring [...] To stay away from polluted sources like vehicular exhausts during transit to school or dusty environments at school by covering nose with cloth or mask',
    );
    const vulnerable = COMMUNITY_ADVICE.find((fact) => fact.id === 'community-advice-vulnerable-groups');
    expect(vulnerable?.kind === 'text' && vulnerable.text).toContain(
      'in air polluted settings, labours working near boilers or furnace smelters, miners etc. are at higher risk.',
    );
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
