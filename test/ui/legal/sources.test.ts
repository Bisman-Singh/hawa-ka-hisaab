// Tests for the sources list: every cited source once.
import { describe, expect, it } from 'vitest';
import { FACT_LIST } from '../../../src/config/facts/index.js';
import { citedSources } from '../../../src/ui/legal/sources.js';

describe('citedSources', () => {
  it('lists every cited source once, by address', () => {
    const sources = citedSources();
    const urls = sources.map((source) => source.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(new Set(FACT_LIST.map((fact) => fact.source.url))).toEqual(new Set(urls));
  });
});
