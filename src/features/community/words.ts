// The notice's wording from words.json: band names, our Hindi advice, the frame and each action's words and facts.
// Numbers never sit in the words; they enter through {placeholders} whose values carry their fact ids.
import type { Language } from '../../lib/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { ActionId } from './rules.js';
import type { CommunityKind } from './types.js';
import WORDS from './words.json' with { type: 'json' };

/** A value that differs by kind of community, or one value for both. */
export type PerKind<T> = T | Readonly<Record<CommunityKind, T>>;

const isPerKind = <T>(value: PerKind<T>): value is Readonly<Record<CommunityKind, T>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The value for this kind of community. */
export function forKind<T>(value: PerKind<T>, kind: CommunityKind): T {
  return isPerKind(value) ? value[kind] : value;
}

/** One action: its title, the notice line in each language, the reason and the facts it cites. */
export interface ActionWords {
  readonly title: PerKind<string>;
  readonly line: Readonly<Record<Language, PerKind<string>>>;
  readonly detail: PerKind<string>;
  readonly factIds: PerKind<readonly string[]>;
}

/** What the opening line can say about the reading. */
export type ReadingState = 'station' | 'station_no_aqi' | 'modelled' | 'none';

/** The code-written parts of a notice in one language. */
export interface FrameText {
  readonly title: PerKind<string>;
  readonly greeting: PerKind<string>;
  readonly reading: Readonly<Record<ReadingState, string>>;
  readonly stale: string;
  readonly early: string;
  readonly closing: PerKind<string>;
}

/** CPCB band names in English and Hindi. */
export const BAND_NAMES: Readonly<Record<Language, Readonly<Record<AqiBand, string>>>> = WORDS.bands;

/**
 * The Hindi band names as the text uses them, before हवा or श्रेणी. Both nouns are feminine, so good agrees as
 * अच्छी; the other names do not change. The text names a band this way rather than in quote marks.
 */
export const BAND_HI_BEFORE_NOUN: Readonly<Record<AqiBand, string>> = WORDS.bandsBeforeNoun;

/** The health ministry advice by band, in our Hindi rendering of the English text. */
export const ADVICE_HI: Readonly<Record<AqiBand, { readonly general: string; readonly vulnerable: string }>> =
  WORDS.adviceHi;

/** The notice frame in each language. */
export const FRAMES: Readonly<Record<Language, FrameText>> = WORDS.frame;

/** Every action's words, in rank order. */
export const ACTIONS: Readonly<Record<ActionId, ActionWords>> = WORDS.actions;
