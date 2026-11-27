// Tests for the vocabulary: Hindi has every key English has, in Devanagari, no nukta, no English words beyond the
// terms kept on purpose, the same digits as the English, and the advice as the community notice renders it.
import { describe, expect, it } from 'vitest';
import { adviceText } from '../../../src/config/facts/advice.js';
import { ADVICE_HI } from '../../../src/features/community/words.js';
import { HINDI_ADVICE_NOTE, LEXICON_EN, LEXICON_HI } from '../../../src/features/planner/words-lexicon.js';

/** The nukta on these five letters, which the notice spelling leaves out; the two flapped letters are letters. */
const NUKTA = /[\u0915\u0916\u0917\u091C\u092B]\u093C|[\u0958-\u095B\u095E]/u;
const KEPT_ENGLISH = /(AQI|AC|N95|N99|CO₂|PM2\.5|CADR|LPG|µg\/m³)/gu;
const digits = (text: string): string[] => text.match(/\d+/g) ?? [];
const TABLES: readonly ('kind' | 'band' | 'mode' | 'fuel' | 'room' | 'slot')[] = [
  'kind',
  'band',
  'mode',
  'fuel',
  'room',
  'slot',
];

describe('the plan text tables', () => {
  it('have the same keys and names in both languages', () => {
    expect(Object.keys(LEXICON_HI.text).sort()).toEqual(Object.keys(LEXICON_EN.text).sort());
    for (const table of TABLES) {
      expect(Object.keys(LEXICON_HI[table]).sort()).toEqual(Object.keys(LEXICON_EN[table]).sort());
    }
  });

  it('write Hindi in Devanagari without nukta or stray English, with the same digits as the English', () => {
    const hiText: Readonly<Record<string, string>> = LEXICON_HI.text;
    for (const [key, english] of Object.entries(LEXICON_EN.text)) {
      const hindi = hiText[key] ?? '';
      const words = hindi.replace(/\{\w+\}/gu, '');
      const latin = words.replace(KEPT_ENGLISH, '').match(/[A-Za-z]+/gu) ?? [];
      expect({ key, latin, nukta: NUKTA.test(hindi) }).toEqual({ key, latin: [], nukta: false });
      expect({ key, devanagari: /[ऀ-ॿ]/u.test(words) }).toEqual({ key, devanagari: /\p{L}/u.test(words) });
      expect({ key, digits: digits(hindi) }).toEqual({ key, digits: digits(english) });
    }
  });

  it('keep the advisory word for word in English and as the notice renders it in Hindi', () => {
    expect(LEXICON_EN.advice('moderate', 'vulnerable')).toBe(adviceText('moderate', 'vulnerable'));
    expect(LEXICON_HI.advice('moderate', 'vulnerable')).toBe(ADVICE_HI.moderate.vulnerable);
    expect(HINDI_ADVICE_NOTE).toMatch(/मूल अंग्रेजी पाठ/u);
    expect(LEXICON_EN.ownLabels && !LEXICON_HI.ownLabels).toBe(true);
  });
});
