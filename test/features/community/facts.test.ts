// Tests for looking up community facts by id.
import { describe, expect, it } from 'vitest';
import { factText, factValue } from '../../../src/features/community/facts.js';

describe('factValue', () => {
  it('takes the value or either end of the range', () => {
    expect(factValue('community-mask-cloth-filtration', 'high')).toMatchObject({
      value: 55,
      unit: '% filtered',
    });
    expect(factValue('community-mask-cloth-filtration', 'low').value).toBe(47);
    expect(factValue('community-share-dg-sets', 'value')).toEqual({
      id: 'community-share-dg-sets',
      label: 'DG sets, share of Delhi winter fine particle pollution',
      value: 5,
      unit: '%',
    });
  });

  it('gives the value for any pick when the fact has no range', () => {
    expect(factValue('community-share-transport', 'high').value).toBe(28);
  });

  it('throws for an id that is not a number fact, which is a coding error', () => {
    expect(() => factValue('advice-masks', 'value')).toThrow('not a community number fact');
    expect(() => factValue('no-such-fact', 'value')).toThrow('not a community number fact');
  });
});

describe('factText', () => {
  it('returns the quoted text and throws for a number fact', () => {
    expect(factText('advice-poor-general')).toBe('Avoid outdoor physical exertion');
    expect(() => factText('community-share-dg-sets')).toThrow('not a community text fact');
  });
});
