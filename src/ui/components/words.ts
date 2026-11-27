// The words the frame and the shared components show, from words.json. The interface is English; Hindi appears
// only in generated content, which carries lang="hi".
import type { AqiBand } from '../../features/naqi/types.js';
import { fill } from '../../lib/template.js';
import type { ApiCallFailure } from '../api-client.js';
import WORDS from './words.json' with { type: 'json' };

/** Strings of the frame and the shared components. */
export const UI = WORDS.ui;

/** Words for one band: its name, its place on the scale and CPCB's health statement. */
export interface BandText {
  readonly name: string;
  readonly ordinal: string;
  readonly statement: string;
}

/** Name and CPCB health statement of each band, quoted from CPCB's National Air Quality Index report. */
export const BAND_TEXT: Readonly<Record<AqiBand, BandText>> = WORDS.bands;

/**
 * A value placed on the band scale. label says what it is, such as "CPCB AQI" for a station or "Estimated index"
 * for the model path, so an estimate is never read out as an AQI reading.
 */
export interface ScaleValue {
  readonly label: string;
  readonly value: number;
  readonly band: AqiBand;
}

/** The sentence a screen reader hears for the band scale, such as "CPCB AQI 342 is in the fifth of six bands". */
export function scaleSentence({ label, value, band }: ScaleValue, range: string): string {
  return fill(WORDS.scale, { label, value, range, ...BAND_TEXT[band] });
}

/** A title and a next step for a failed request, in plain words. */
export interface FailureText {
  readonly title: string;
  readonly body: string;
}

/** Words for a failed request. A rate limit names the wait when the server gave one. */
export function failureText(failure: ApiCallFailure): FailureText {
  const { failures, wait } = WORDS;
  if (failure.kind === 'api' && failure.code === 'rate_limited') {
    const seconds = failure.retryAfterSeconds;
    const words = seconds === null ? wait.unknown : fill(wait.seconds, { seconds });
    return { ...failures.rate_limited, body: fill(failures.rate_limited.body, { wait: words }) };
  }
  if (failure.kind === 'api' && failure.code === 'upstream_unavailable') {
    return failures.upstream_unavailable;
  }
  return failures[failure.kind];
}

const SINGULAR: Readonly<Record<string, string>> = WORDS.singular;

/** A value with its unit, the unit in the singular for a count of one, such as 1 person or 2 people. */
export function amountText(value: number, unit: string): string {
  return `${String(value)} ${value === 1 ? (SINGULAR[unit] ?? unit) : unit}`;
}
