// Tests for the community strings: every generator and burning choice has words, and the Hindi label is Hindi.
import { describe, expect, it } from 'vitest';
import { COMMUNITY } from '../../../src/ui/community/words.js';

describe('COMMUNITY', () => {
  it('words every choice and labels the Hindi notice in Devanagari', () => {
    expect(Object.keys(COMMUNITY.generatorFuel)).toEqual(['none', 'diesel', 'gas', 'unknown']);
    expect(Object.keys(COMMUNITY.burningWhen)).toEqual(['never', 'sometimes', 'often']);
    expect(COMMUNITY.noticeHindi).toMatch(/[ऀ-ॿ]/);
  });
});
