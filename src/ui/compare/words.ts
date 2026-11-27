// The words of the compare view, from words.json.
import type { CompareTopic } from '../../features/planner/compare.js';
import WORDS from './words.json' with { type: 'json' };

/** Strings of the compare view. */
export const COMPARE = WORDS.compare;

/** Each row of the comparison: what it is about and why households differ there. */
export const TOPICS: Readonly<Record<CompareTopic, { readonly title: string; readonly why: string }>> =
  WORDS.topics;
