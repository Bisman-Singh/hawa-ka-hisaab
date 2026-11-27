// The words of the day plan screens, from words.json: the plan's labels in English and Hindi, so a Hindi plan reads
// as Hindi around its text, and the English words of the plan view and the forecast strip.
import type { Language } from '../../lib/types.js';
import WORDS from './words.json' with { type: 'json' };

/** The labels a plan's entries and reckoning carry, in the plan's own language. {time} and {count} are filled in. */
export type PlanLabels = typeof WORDS.labels.en;

/** The plan's labels in English and in Hindi. Hindi spelling follows the plan text tables. */
export const PLAN_LABELS: Readonly<Record<Language, PlanLabels>> = WORDS.labels;

/** What ends a sentence in each language, so a spoken label and the sentence after it read as two. */
export const STOPS: Readonly<Record<Language, string>> = WORDS.stops;

/** Strings of the plan view and its parts. The English plan labels are among them. */
export const PLAN = { ...WORDS.labels.en, ...WORDS.plan };

/** Strings of the forecast strip. */
export const STRIP = WORDS.strip;
