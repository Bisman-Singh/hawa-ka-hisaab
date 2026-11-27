// Tests for quote marks in model prose: official text word for word or a band name passes, a rendering does not.
import { describe, expect, it } from 'vitest';
import { misquotes, quotedPassages } from '../../../src/features/assistant/quotes.js';

describe('misquotes', () => {
  it('accepts the advisory quoted word for word, in any case and punctuation, and band names', () => {
    expect(misquotes(['Advice: "Avoid prolonged or strenuous outdoor physical exertion".'])).toBe(false);
    expect(misquotes(['Advice: “avoid prolonged, or strenuous outdoor physical exertion”'])).toBe(false);
    expect(misquotes(['आज हवा "मध्यम" श्रेणी में है।', 'The air is "Very Poor".'])).toBe(false);
    expect(misquotes(['No quotes here.'])).toBe(false);
  });

  it('refuses a paraphrase, a Hindi rendering, part of a word and empty quotes', () => {
    expect(misquotes(['Advice: "Avoid long outdoor exercise".'])).toBe(true);
    expect(misquotes(['सलाह: "बाहर देर तक मेहनत से बचें"।'])).toBe(true);
    expect(misquotes(['"void"'])).toBe(true);
    expect(misquotes(['""'])).toBe(true);
  });

  it('finds every quoted passage', () => {
    expect(quotedPassages('"a" and “b”')).toEqual(['a', 'b']);
  });
});
