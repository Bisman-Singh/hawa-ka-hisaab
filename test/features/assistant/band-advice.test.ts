// Tests for the band advice sentence: the advisory quoted word for word in English, the notice's Hindi, and its facts.
import { describe, expect, it } from 'vitest';
import { factQuote } from '../../../src/config/facts/index.js';
import { bandAdvice } from '../../../src/features/assistant/band-advice.js';

describe('bandAdvice', () => {
  it('quotes the advisory for vulnerable people and everyone else, citing both facts', () => {
    const advice = bandAdvice('severe', 'en');
    expect(advice.text).toBe(
      `Health advice for Severe air. For children, older people, pregnant women and people with heart or lung illness, "${factQuote('advice-severe-vulnerable')}". For everyone else, "${factQuote('advice-severe-general')}".`,
    );
    expect(advice.factIds).toEqual([
      'advice-severe-vulnerable',
      'advice-severe-general',
      'advice-vulnerable-groups',
    ]);
  });

  it('gives the same advice in Hindi with no placeholder left', () => {
    const advice = bandAdvice('good', 'hi');
    expect(advice.text).toMatch(/^"अच्छा" हवा के लिए स्वास्थ्य सलाह।/);
    expect(advice.text).not.toMatch(/[{}]/);
  });
});
