// Quote marks in model prose may hold only official wording, word for word: a passage of a quoted fact or a CPCB
// band name. A rendering of the advisory in other words, in Hindi above all, is never put in quotes.
import { FACT_LIST } from '../../config/facts/index.js';
import { BAND_EN } from '../community/text-en.js';
import { BAND_HI } from '../community/text-hi.js';

const QUOTED = /["“”]([^"“”]*)["“”]/gu;

/** Text reduced for comparison: compatibility forms, case, punctuation and runs of space set aside. */
function squash(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}

const OFFICIAL: readonly string[] = [
  ...FACT_LIST.flatMap((fact) => (fact.kind === 'text' ? [fact.text] : [])),
  ...Object.values(BAND_EN),
  ...Object.values(BAND_HI),
].map((text) => ` ${squash(text)} `);

/** The passages inside quote marks in a text, in order. */
export function quotedPassages(text: string): string[] {
  return [...text.matchAll(QUOTED)].map(([, inside = '']) => inside);
}

/**
 * True when any text puts words in quote marks that are not, word for word, part of an official text the app
 * holds, in whole words. Case, punctuation and spacing do not count; any other change does. Empty quotes are
 * misquotes too.
 */
export function misquotes(texts: readonly string[]): boolean {
  return texts.some((text) =>
    quotedPassages(text).some((passage) => {
      const words = squash(passage);
      return words === '' || !OFFICIAL.some((official) => official.includes(` ${words} `));
    }),
  );
}
