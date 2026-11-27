// Tests for how the medical gate reads text: folded Hindi, no invisible characters, Latin for lookalikes.
import { describe, expect, it } from 'vitest';
import { foldDevanagari, readForMatching } from '../../../src/features/assistant/lookalikes.js';

describe('foldDevanagari', () => {
  it('reads nukta and chandrabindu spellings alike', () => {
    expect(foldDevanagari('साँस तकलीफ़')).toBe(foldDevanagari('सांस तकलीफ'));
  });
});

describe('readForMatching', () => {
  it('keeps Cyrillic and Greek letters that look like no Latin letter', () => {
    expect(readForMatching('\u{0436}\u{03BB}')).toBe('\u{0436}\u{03BB}');
  });

  it('replaces Cyrillic and Greek lookalikes and drops invisible characters', () => {
    expect(readForMatching('c\u{043E}ugh \u{0441}\u{043E}ld \u{03BF}k cou\u{200B}gh\u{00AD}ing')).toBe(
      'cough cold ok coughing',
    );
  });

  it('joins letters spelled out one by one, and straightens apostrophes', () => {
    expect(readForMatching('c-o-u-g-h-i-n-g, d.o.s.e and can’t')).toBe("coughing, dose and can't");
    expect(readForMatching('e.g. at 7 a.m.')).toBe('e.g. at 7 a.m.');
  });
});
