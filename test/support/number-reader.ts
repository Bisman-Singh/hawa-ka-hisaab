// An independent reader of the numbers in response text, for the central claim: it does not use the app's own
// number guard, so a fault in the guard cannot hide a number the trace does not hold.
import type { JsonValue } from '../../src/lib/json.js';
import type { Trace } from '../../src/lib/types.js';

const NAMES =
  /(?<![\p{L}\d])(?:pm\s?2\.5|pm\s?10|co2e?|no2|so2|nh3|o3|kn95|n9[59]|ffp[123])(?![\p{L}\d])|(?<!\p{L})(?:k?m|cm|ft)[23²³](?![\p{L}\d])|m³/giu;

/** A numeral found in text: a clock time as hour and minute, or a plain number. */
export type Found =
  | { readonly kind: 'time'; readonly hour: number; readonly minute: number; readonly raw: string }
  | { readonly kind: 'number'; readonly value: number; readonly raw: string };

/**
 * Every numeral in a text, read without the app's own number guard: Devanagari digits as ASCII, pollutant and unit
 * names left out, HH:MM as a time, and every other run of digits as a number.
 */
export function numbersIn(text: string): Found[] {
  const ascii = text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966)).replace(NAMES, ' ');
  const times = [...ascii.matchAll(/(?<![\d.:])(\d{1,2}):(\d{2})(?![\d:])/g)].map(
    ([raw, hour = '', minute = '']): Found => ({
      kind: 'time',
      hour: Number(hour),
      minute: Number(minute),
      raw,
    }),
  );
  const rest = ascii.replace(/(?<![\d.:])\d{1,2}:\d{2}(?![\d:])/g, ' ');
  const numbers = [...rest.matchAll(/\d+(?:\.\d+)?/g)].map(([raw]): Found => ({
    kind: 'number',
    value: Number(raw),
    raw,
  }));
  return [...times, ...numbers];
}

function valuesIn(value: JsonValue | null): number[] {
  if (typeof value === 'number') {
    return [value];
  }
  if (typeof value === 'string') {
    return numbersIn(value).flatMap((found) =>
      found.kind === 'number' ? [found.value] : [found.hour, found.minute],
    );
  }
  return value !== null && typeof value === 'object' ? Object.values(value).flatMap(valuesIn) : [];
}

/**
 * The numerals in the texts that are not in the trace: a number must equal a value in factsSent or in a tool
 * result; a time must have its hour, in 24 or 12 hour form, and its minute among those values.
 */
export function untraced(texts: readonly string[], trace: Trace): string[] {
  const allowed = new Set([
    ...trace.factsSent.map((fact) => fact.value),
    ...trace.toolCalls.flatMap((call) => valuesIn(call.result)),
  ]);
  const ok12 = (hour: number): boolean => allowed.has(hour) || allowed.has(hour % 12 === 0 ? 12 : hour % 12);
  return texts.flatMap((text) =>
    numbersIn(text)
      .filter((found) =>
        found.kind === 'number'
          ? !allowed.has(found.value)
          : !(ok12(found.hour) && allowed.has(found.minute)),
      )
      .map((found) => `${found.raw} in "${text.slice(0, 80)}"`),
  );
}
