// The plan's vocabulary in English and Hindi: the text tables in words/, names for activities, bands, modes, fuels,
// rooms and parts of the day, the health ministry advice in the plan's language and words for people.
import { adviceText, type AdviceGroup } from '../../config/facts/advice.js';
import type { Language } from '../../lib/types.js';
import { ADVICE_HI, BAND_HI_BEFORE_NOUN } from '../community/words.js';
import type { ActivityKind, Room, TravelMode } from '../household/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { Slot } from './types.js';
import TEXT_EN from './words/en.json' with { type: 'json' };
import TEXT_HI from './words/hi.json' with { type: 'json' };
import NAMES_EN from './words/names-en.json' with { type: 'json' };
import NAMES_HI from './words/names-hi.json' with { type: 'json' };
import { PEOPLE_EN, PEOPLE_HI, type PeopleWords } from './words-people.js';

/** A key of the plan text tables. English sets the keys; Hindi must have every one. */
export type TextKey = keyof typeof TEXT_EN;

/** The Hindi plan text, checked to have every English key. Values enter through {names}. */
export const PLAN_TEXT_HI: Readonly<Record<TextKey, string>> = TEXT_HI;

/** The line a Hindi plan shows once: the health ministry's words are rendered and the original is in the sources. */
export const HINDI_ADVICE_NOTE = PLAN_TEXT_HI.advice_note;

/** Cooking fuels that smoke. */
export type SmokyFuel = 'biomass' | 'coal' | 'kerosene';

/** Everything the plan says, in one language. ownLabels says whether the household's own labels can be shown. */
export interface Lexicon {
  readonly language: Language;
  readonly text: Readonly<Record<TextKey, string>>;
  readonly kind: Readonly<Record<ActivityKind, string>>;
  readonly band: Readonly<Record<AqiBand, string>>;
  readonly mode: Readonly<Record<TravelMode, string>>;
  readonly fuel: Readonly<Record<SmokyFuel, string>>;
  readonly room: Readonly<Record<Room['kind'], string>>;
  readonly slot: Readonly<Record<Slot, string>>;
  readonly ownLabels: boolean;
  readonly advice: (band: AqiBand, group: AdviceGroup) => string;
  readonly people: PeopleWords;
}

/** English words. */
export const LEXICON_EN: Lexicon = {
  language: 'en',
  text: TEXT_EN,
  ...NAMES_EN,
  ownLabels: true,
  advice: adviceText,
  people: PEOPLE_EN,
};

/** Hindi words. Band names are the community notice's, in the form that goes before हवा or श्रेणी. */
export const LEXICON_HI: Lexicon = {
  language: 'hi',
  text: PLAN_TEXT_HI,
  ...NAMES_HI,
  band: BAND_HI_BEFORE_NOUN,
  ownLabels: false,
  advice: (band, group) => ADVICE_HI[band][group],
  people: PEOPLE_HI,
};
