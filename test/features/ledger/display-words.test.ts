// Tests for the effect words: both languages have every word, and CO2 gets its subscript.
import { describe, expect, it } from 'vitest';
import { EFFECT_WORDS, withSubscripts } from '../../../src/features/ledger/display-words.js';

describe('effect words', () => {
  it('has the same words in English and Hindi, with the Hindi in Devanagari', () => {
    const keys = (value: object): string[] => Object.keys(value).sort();
    expect(keys(EFFECT_WORDS.hi)).toEqual(keys(EFFECT_WORDS.en));
    expect(EFFECT_WORDS.hi.less).toMatch(/[ऀ-ॿ]/u);
    expect(EFFECT_WORDS.en.co2.display).toBe('CO₂');
  });

  it('writes CO2 with its subscript and changes nothing else', () => {
    expect(withSubscripts('Less CO2 on the bus, not CO20.')).toBe('Less CO₂ on the bus, not CO20.');
  });
});
