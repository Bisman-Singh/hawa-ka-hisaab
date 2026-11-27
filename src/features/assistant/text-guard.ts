// Checks on model prose besides numbers: no markup, no links or contact details, no hidden characters, no third
// script, and no names from the person's text. Names in Devanagari or typed in lower case cannot be told apart.

/** What is wrong with a piece of prose. */
export type ProseProblem = 'markup' | 'link' | 'hidden' | 'script';

const MARKUP = /[<>]|&#?\w+;|javascript:|data:text/iu;
const LINKS: readonly RegExp[] = [
  /\b(?:https?|ftp):\/\/|\bwww\.|@/iu,
  /\b[\p{L}\p{N}-]{2,}(?:\.[\p{L}\p{N}-]+)*\.(?:com|in|org|net|co|io|app|gov|info|me|ai|ly|xyz|site|online|biz)(?![\p{L}\p{N}])/u,
  /(?<![\p{N}.:/-])(?:\+\s?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}(?!\p{N})/u,
  /(?<![\p{N}.:/-])(?:1800|1860)[\s-]?\d{3}[\s-]?\d{4}(?!\p{N})|\+\s?\d{1,3}(?:[\s-]?\d){7,}/u,
];
const HIDDEN = /[\p{Cc}\p{Cf}]/u;
const LINE_BREAKS = /[\n\t]/gu;
const JOINER = /(?<=\p{Script=Devanagari})[\u{200C}\u{200D}](?=\p{Script=Devanagari})/gu;
const STRAY_MARK = /(?<![\p{L}\p{M}])\p{M}/u;
const OTHER_SCRIPT = /[^\p{Script=Latin}\p{Script=Devanagari}\p{Script=Common}\p{Script=Inherited}]/u;

const hidden = (text: string): boolean =>
  HIDDEN.test(text.replace(LINE_BREAKS, '').replace(JOINER, '')) || STRAY_MARK.test(text);

/**
 * Finds markup, links, hidden characters or letters of a third script. Angle brackets, entities and script URLs
 * are refused, and so are web addresses, domains, email addresses and phone numbers, since a notice is pasted into
 * chats that turn them into links. Control and format characters are refused, except line breaks, tabs and the two
 * joiners Hindi uses between Devanagari letters; so is a combining mark that follows no letter. Only Latin and
 * Devanagari letters are accepted, so a stray letter from another script is caught.
 */
export function proseProblem(texts: readonly string[]): ProseProblem | null {
  if (texts.some((text) => MARKUP.test(text))) {
    return 'markup';
  }
  if (texts.some((text) => LINKS.some((link) => link.test(text)))) {
    return 'link';
  }
  if (texts.some(hidden)) {
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
