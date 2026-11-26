// Tests for the prose checks: no markup, no hidden characters, and no names repeated from the person's text.
import { describe, expect, it } from 'vitest';
import { nameLikeWords, proseProblem, repeatsName } from '../../../src/features/assistant/text-guard.js';

describe('proseProblem', () => {
  it('passes plain English and Hindi, including the joiners Hindi text uses', () => {
    expect(proseProblem(['Keep the windows shut.', 'खिड़की बंद रखें।', 'क्\u200Dष', 'two\nlines\tok'])).toBeNull();
  });

  it.each([
    '<img src=x onerror=alert(1)>',
    'Close windows <b>now</b>',
    'a > b',
    'see javascript:alert(1)',
    'data:text/html,hi',
    '&lt;script&gt;',
    '&#60;script',
  ])('rejects markup: %s', (text) => {
    expect(proseProblem(['fine', text])).toBe('markup');
  });

  it.each(['AQI \u202E54\u202C', 'zero\u200Bwidth', 'bell\u0007', 'bom\uFEFF', 'mark\u200F'])(
    'rejects hidden characters: %j',
    (text) => {
      expect(proseProblem([text])).toBe('hidden');
    },
  );
});

describe('nameLikeWords', () => {
  it('collects capitalised words, minus common sentence starters and words also written in lower case', () => {
    const text =
      'My son Arjun has cricket at 4. Riya walks. Football is at 6, football is fun. We live in Noida.';
    expect([...nameLikeWords(text)].sort()).toEqual(['arjun', 'noida', 'riya']);
  });

  it('finds nothing in text with no words', () => {
    expect([...nameLikeWords('123 456')]).toEqual([]);
    expect(repeatsName(['123'], new Set(['meera']))).toBe(false);
  });

  it('ignores acronyms and short capitals', () => {
    expect([...nameLikeWords('We use CNG and LPG. I drive. AQI is high.')]).toEqual([]);
  });
});

describe('repeatsName', () => {
  it('finds a name from the input in any case', () => {
    const names = nameLikeWords('Our daughter Meera has football.');
    expect(repeatsName(["meera's football"], names)).toBe(true);
    expect(repeatsName(['football practice'], names)).toBe(false);
    expect(repeatsName(['MEERA practice'], names)).toBe(true);
  });
});
