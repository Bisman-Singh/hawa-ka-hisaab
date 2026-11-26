// Tests for the study source records.
import { describe, expect, it } from 'vitest';
import * as studies from '../../../src/config/facts/studies.js';
import { sourceSchema } from '../../../src/lib/schemas/facts.js';

describe('studies', () => {
  it('are valid sources, each naming its doi in the title', () => {
    const all = Object.values(studies);
    expect(all.length).toBe(9);
    expect(all.filter((source) => !sourceSchema.safeParse(source).success)).toEqual([]);
    expect(all.every((source) => source.title.includes('doi 10.'))).toBe(true);
  });
});
