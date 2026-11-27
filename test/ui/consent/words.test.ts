// Tests for the model note: it states the free tier terms plainly, says conditions go as general flags, asks for no
// names, and is the same note wherever it shows.
import { describe, expect, it } from 'vitest';
import { CONSENT } from '../../../src/ui/consent/words.js';
import { INTAKE } from '../../../src/ui/household/words.js';

describe('CONSENT', () => {
  it('says what is sent, that Google may use it and read it, and what not to add', () => {
    expect(CONSENT.sent).toMatch(/conditions as general flags such as asthma or pregnancy/);
    expect(CONSENT.terms).toBe(
      "This app uses Gemini's free tier, so Google may use what is sent to improve its products, and people at Google may read it.",
    );
    expect(CONSENT.ask).toMatch(/Do not add names, record numbers/);
    expect(CONSENT.kept).toMatch(/five minutes/);
  });

  it('agrees with the intake hint: conditions are asked for, names are not', () => {
    expect(INTAKE.hint).toMatch(/any condition such as asthma/);
    expect(INTAKE.hint).toMatch(/No names\.$/);
    expect(INTAKE.read).toBe('Read it with the model');
  });
});
