// The words of the household intake and form, from words.json, with the counts and fixes they fill in.
import { MAX_INTAKE_TEXT_CHARS } from '../../config/limits.js';
import { fill } from '../../lib/template.js';
import type { FallbackReason } from '../../lib/types.js';
import WORDS from './words.json' with { type: 'json' };

/** Fixed text of the intake box on the first screen. */
export const INTAKE = WORDS.intake;

/** Why the model did not read the text, in plain words. */
export const MODEL_DOWN: Readonly<Record<FallbackReason, string>> = WORDS.modelDown;

/** Fixed text of the household view. */
export const HOUSEHOLD = WORDS.household;

/** Fixed text of the form. */
export const FORM = WORDS.form;

/** The character count under the intake box, or the problem when the text is too long. */
export function charsText(chars: number, tooLong = false): string {
  return fill(tooLong ? INTAKE.tooLong : INTAKE.count, { chars, max: MAX_INTAKE_TEXT_CHARS });
}

/** How many fields need a fix, as the form says it after a refused save. */
export function fixText(n: number): string {
  return fill(n === 1 ? FORM.fixOne : FORM.fixMany, { n });
}
