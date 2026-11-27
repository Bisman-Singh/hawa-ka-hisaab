// Words for effects as the page lays them out, in English and Hindi; the words are data in effect-words.json.
// Display text writes CO₂ with its subscript and × for a multiple; plain text spells them for screen readers.
import type { Language } from '../../lib/types.js';
import WORDS from './effect-words.json' with { type: 'json' };

/** What a range of exposure figures spans, named by the method the effect cites. */
export type ExposureBasis = 'start_hour' | 'vehicle_air' | 'closed_car' | 'pace' | 'mask_fit' | 'other';

/** The words for one language. */
export interface EffectWords {
  readonly less: string;
  readonly more: string;
  readonly times: { readonly display: string; readonly plain: string };
  readonly co2: { readonly display: string; readonly plain: string };
  readonly none: string;
  readonly upTo: string;
  readonly span: string;
  readonly range: string;
  readonly or: string;
  readonly kg: string;
  readonly breathedIn: string;
  readonly forEach: string;
  readonly forecastOnly: string;
  readonly stop: string;
  readonly basis: Readonly<Record<ExposureBasis, string>>;
  readonly crossing: Readonly<Record<ExposureBasis, string>>;
  readonly wide: Readonly<Record<ExposureBasis, string>>;
  readonly legs: Readonly<Record<'both' | 'one' | 'day' | 'week', string>>;
  readonly riders: Readonly<Record<'now' | 'shared', string>>;
  readonly co2Range: Readonly<Record<'two_wheeler' | 'fuel', string>>;
}

/** The effect words for a language, from effect-words.json and checked against EffectWords. */
export const EFFECT_WORDS: Readonly<Record<Language, EffectWords>> = WORDS;

/** Fills {names} in a template; a name with no value stays as written. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => values[name] ?? match);
}

/** Text with CO2 written with its subscript, for display. Other text is unchanged. */
export function withSubscripts(text: string): string {
  return text.replace(/\bCO2\b/g, 'CO₂');
}
