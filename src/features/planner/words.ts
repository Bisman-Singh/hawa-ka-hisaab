// The plan's words in its language: looking up the vocabulary, filling templates, naming activities and groups.
import type { Language } from '../../lib/types.js';
import type { Activity, Household, Member } from '../household/types.js';
import { fill } from '../../lib/template.js';
import { LEXICON_EN, LEXICON_HI, type Lexicon, type TextKey } from './words-lexicon.js';

/** The words of one language and a key of its text tables, for callers that only need the types. */
export type { Lexicon, TextKey } from './words-lexicon.js';

const LEXICONS: Readonly<Record<Language, Lexicon>> = { en: LEXICON_EN, hi: LEXICON_HI };

/** The words for a language. */
export function lexiconFor(language: Language): Lexicon {
  return LEXICONS[language];
}

/** A template from the tables with its {names} filled. */
export function say(lex: Lexicon, key: TextKey, values: Readonly<Record<string, string>> = {}): string {
  return fill(lex.text[key], values);
}

/**
 * What to call an activity: its own label in English, or the plain name of its kind, told apart from another of
 * the same kind by its start time. Hindi plans always use the kind, since labels are typed in English.
 */
export function nameOf(lex: Lexicon, household: Household, activity: Activity): string {
  if (lex.ownLabels && activity.label !== null) {
    return activity.label;
  }
  const twin = household.activities.some((other) => other.id !== activity.id && other.kind === activity.kind);
  const kind = lex.kind[activity.kind];
  return twin ? say(lex, 'name_at', { name: kind, time: activity.start }) : kind;
}

/** A group of people in words: one or two named, a pair of the same age together, or everyone going. */
export function groupOf(lex: Lexicon, members: readonly Member[]): string {
  const [first, second] = members;
  if (first === undefined || members.length > 2) {
    return say(lex, 'group_many');
  }
  const one = (member: Member): string => say(lex, 'group_one', { member: lex.people.member(member) });
  if (second === undefined) {
    return one(first);
  }
  return first.ageGroup === second.ageGroup
    ? say(lex, 'group_two_same', { plural: lex.people.plural[first.ageGroup] })
    : say(lex, 'group_pair', { one: one(first), two: one(second) });
}
