// Tests for the words of the plain pages: the contact address is the issue page, the terms link is Google's, and the
// privacy lines state the host's request logging and the five minute reuse truthfully.
import { describe, expect, it } from 'vitest';
import { ABOUT, GEMINI_TERMS_URL, ISSUES_URL, PRIVACY } from '../../../src/ui/legal/words.js';

describe('plain page strings', () => {
  it('holds the contact address in one constant and links Google terms', () => {
    expect(ISSUES_URL).toBe('https://github.com/Bisman-Singh/hawa-ka-hisaab/issues');
    expect(GEMINI_TERMS_URL).toBe('https://ai.google.dev/gemini-api/terms');
  });

  it('says what the host logs and what the server reuses, and that a plan sends the household', () => {
    const kept = PRIVACY.keptLines.map((line) => line.text).join(' ');
    expect(kept).toMatch(/Vercel, keeps request logs for up to a day/);
    expect(kept).toMatch(/IP address and browser/);
    expect(kept).toMatch(/last five minutes/);
    expect(PRIVACY.sentLines.map((line) => line.label)).toEqual([
      'Your place',
      'The air',
      'Your words',
      'Plans, questions, notices',
    ]);
    expect(PRIVACY.googleTerms).toMatch(/human reviewers may read, annotate and process it/);
    expect(ABOUT.modelledText).toMatch(/within 50 km/);
  });
});
