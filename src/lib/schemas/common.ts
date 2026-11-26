// Shared schema primitives: timestamps, clock times, languages and numeric ranges.
import { z } from 'zod';

/** An ISO 8601 timestamp with an offset, such as 2026-11-24T22:00:00+05:30. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** An ISO calendar date, such as 2026-11-24. */
export const isoDateSchema = z.iso.date();

/** A 24 hour clock time in IST as HH:MM, such as 07:30. */
export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Languages generated text can be shown in. */
export const languageSchema = z.enum(['en', 'hi']);

/** A closed numeric interval. Low never exceeds high. */
export const rangeSchema = z
  .strictObject({ low: z.number(), high: z.number() })
  .refine((range) => range.low <= range.high, { error: 'low must not exceed high' });

/** Trimmed, non-empty text with a length cap. */
export function boundedText(maxChars: number): z.ZodString {
  return z.string().trim().min(1).max(maxChars);
}

/** True when no value appears twice. Used for ids that must be unique within a list. */
export function allUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
