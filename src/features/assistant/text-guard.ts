// Checks on model prose besides numbers: no markup, no hidden characters, no third script, and no names from the
// person's text. Names in Devanagari or typed in lower case cannot be told apart from other words.

/** What is wrong with a piece of prose. */
export type ProseProblem = 'markup' | 'hidden' | 'script';

const MARKUP = /[<>]|&#?\w+;|javascript:|data:text/iu;
const HIDDEN = /[\p{Cc}\p{Cf}]/u;
const ALLOWED_INVISIBLE = /[\n\t\u{200C}\u{200D}]/gu;
const OTHER_SCRIPT = /[^\p{Script=Latin}\p{Script=Devanagari}\p{Script=Common}\p{Script=Inherited}]/u;

/**
 * Finds markup, hidden characters or letters of a third script. Angle brackets, entities and script URLs are
 * refused. Control and format characters are refused, except line breaks, tabs and the two joiners Hindi uses.
 * Only Latin and Devanagari letters are accepted, so a stray letter from another script is caught.
 */
export function proseProblem(texts: readonly string[]): ProseProblem | null {
  if (texts.some((text) => MARKUP.test(text))) {
    return 'markup';
  }
  if (texts.some((text) => HIDDEN.test(text.replace(ALLOWED_INVISIBLE, '')))) {
    return 'hidden';
  }
  return texts.some((text) => OTHER_SCRIPT.test(text)) ? 'script' : null;
}

const COMMON = new Set(
  (
    'my we our the he she they his her their it in on at every each both there this that then and but so also ' +
    'after before usually mornings evenings weekdays weekends grandma grandpa dad mom mum papa mummy dadi dada nani ' +
    'nana mother father son daughter wife husband kids children monday tuesday wednesday thursday friday saturday ' +
    'sunday january february march april may june july august september october november december'
  ).split(' '),
);

const WORD = /(?<!\p{L})[\p{L}\p{M}']+/gu;
const CAPITALISED = /^\p{Lu}[\p{Ll}\p{M}']+$/u;

/**
 * Words in the person's text that may be names: capitalised words that are not common sentence starters or
 * family words, and that never appear in lower case elsewhere in the text. Returned in lower case.
 */
export function nameLikeWords(input: string): ReadonlySet<string> {
  const words = input.match(WORD) ?? [];
  const lower = new Set(words.filter((word) => word === word.toLowerCase()));
  return new Set(
    words
      .filter((word) => CAPITALISED.test(word))
      .map((word) => word.toLowerCase())
      .filter((word) => !COMMON.has(word) && !lower.has(word)),
  );
}

/** True when any text uses one of the name-like words, in any case, alone or with a possessive. */
export function repeatsName(texts: readonly string[], names: ReadonlySet<string>): boolean {
  return texts.some((text) =>
    (text.toLowerCase().match(WORD) ?? []).some((word) => names.has(word.replace(/'s?$/u, ''))),
  );
}
