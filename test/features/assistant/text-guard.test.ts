// Tests for the prose checks: no markup, no links, no hidden characters, no names repeated from the person's text.
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

  it.each([
    'AQI \u202E54\u202C',
    'zero\u200Bwidth',
    'bell\u0007',
    'bom\uFEFF',
    'mark\u200F',
    'join\u200Dlatin',
    '4\u200C5',
    '2\u034F5',
    '\u0301alone',
  ])('rejects hidden characters: %j', (text) => {
    expect(proseProblem([text])).toBe('hidden');
  });

  it.each([
    'Visit https://example.org/claim',
    'ftp://files.example',
    'See www.example.in',
    'Mail me@example.in',
    'Read cleanair.co today',
    'Call 9876543210 now',
    'Call 98765-43210 now',
    'Call +91 9876543210',
    'Call +44 20 7946 0958',
    'Dial 1860-123-4567',
  ])('rejects a link or contact detail: %s', (text) => {
    expect(proseProblem([text])).toBe('link');
  });

  it('keeps figures, times, units and names that look a little like links', () => {
    expect(
      proseProblem([
        'PM2.5 is 3.2 times, 07:45 to 08:30, 12,690 PINs, CaN99 and N95, CO₂ +140%.',
        'Ends at 9 a.m., e.g. by bus. 14 km.In short, 112 is the number.',
        'एक्यूआई 246 है। 1234567 people.',
      ]),
    ).toBeNull();
  });
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
