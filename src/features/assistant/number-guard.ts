// The number guard: every numeral in model text must match a value code sent, after normalising its format.
// The rounding rules it accepts are listed on roundings below.
import type { JsonValue } from '../../lib/json.js';
import { findNumerals, type Numeral, type NumberNumeral } from './numerals.js';

/** A date code sent, as day, month and year. */
export interface AllowedDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

/** Everything model text may state: numbers, times of day in minutes after midnight, and dates. */
export interface AllowedValues {
  readonly numbers: readonly number[];
  readonly times: readonly number[];
  readonly dates: readonly AllowedDate[];
}

/** The guard's answer. unmatched lists each numeral that matched nothing, as found, once. */
export interface NumberVerdict {
  readonly passed: boolean;
  readonly unmatched: readonly string[];
}

const CODE_ID = /^(?=[a-z0-9_-]*[a-z])[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const MAX_UNMATCHED = 50;

/**
 * Collects the allowed values from data code sent: every JSON number, and every numeral inside a string, such as
 * "18:00", "2026-11-24" or template text. Strings that are code ids, such as move-a2 or pm25-24h, are skipped.
 */
export function collectAllowed(sources: readonly JsonValue[]): AllowedValues {
  const numbers: number[] = [];
  const times: number[] = [];
  const dates: AllowedDate[] = [];
  const add = (numeral: Numeral): void => {
    if (numeral.kind === 'number') {
      numbers.push(numeral.value);
    } else if (numeral.kind === 'time') {
      times.push(...numeral.minutes);
    } else if (numeral.year !== null) {
      dates.push({ day: numeral.day, month: numeral.month, year: numeral.year });
    }
  };
  const visit = (value: JsonValue): void => {
    if (typeof value === 'number') {
      numbers.push(value);
    } else if (typeof value === 'string' && !CODE_ID.test(value)) {
      findNumerals(value).forEach(add);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(visit);
    }
  };
  sources.forEach(visit);
  return { numbers, times, dates };
}

// Rounding rules. A value written with fewer decimals must keep two or more digits and stay within 5 percent of
// the value. Values of 1000 or more may keep two or three significant figures. Nothing rounds to 0. A percent may
// show a fraction times 100. Signs are ignored, since text says cuts and rises in words.
const digitCount = (value: number): number => String(value).replace('.', '').replace(/^0+/, '').length;

function roundings(value: number): number[] {
  const size = Math.abs(value);
  const fixed = [0, 1, 2, 3].map((places) => Number(size.toFixed(places)));
  const figures = size >= 1000 ? [2, 3].map((digits) => Number(size.toPrecision(digits))) : [];
  return [size, ...fixed, ...figures].filter((rounded) => {
    const off = Math.abs(rounded - size);
    return off < 1e-9 * Math.max(1, size) || (digitCount(rounded) >= 2 && off <= 0.05 * size);
  });
}

interface Matcher {
  readonly plain: ReadonlySet<number>;
  readonly percent: ReadonlySet<number>;
  readonly allowed: AllowedValues;
}

/** A one that counts something, such as 1 bus, rather than a measure such as 1 kg or 1%. */
const countOfOne = (numeral: NumberNumeral): boolean =>
  numeral.value === 1 && !numeral.percent && numeral.measured !== true;

function matches(numeral: Numeral, matcher: Matcher): boolean {
  switch (numeral.kind) {
    case 'number':
      return (
        Number.isFinite(numeral.value) &&
        (countOfOne(numeral) ||
          matcher.plain.has(numeral.value) ||
          (numeral.percent && matcher.percent.has(numeral.value)))
      );
    case 'time':
      return numeral.minutes.some((minutes) => matcher.allowed.times.includes(minutes));
    case 'date':
      return matcher.allowed.dates.some(
        (date) =>
          date.day === numeral.day &&
          date.month === numeral.month &&
          (numeral.year ?? date.year) === date.year,
      );
  }
}

/**
 * Checks every numeral in the texts against the allowed values. A count of one passes, since it states no
 * measurement, but 1 kg or 1% must match. Every other number must match, in digits of any script, as a word, a
 * Roman numeral or a fraction; a number character the finder cannot read never matches.
 */
export function checkNumbers(texts: readonly string[], allowed: AllowedValues): NumberVerdict {
  const matcher: Matcher = {
    plain: new Set(allowed.numbers.flatMap(roundings)),
    percent: new Set(allowed.numbers.flatMap((value) => roundings(value * 100))),
    allowed,
  };
  const misses = texts
    .flatMap((text) => findNumerals(text))
    .filter((numeral) => !matches(numeral, matcher))
    .map((numeral) => numeral.raw.slice(0, 40));
  const unmatched = [...new Set(misses)].slice(0, MAX_UNMATCHED);
  return { passed: unmatched.length === 0, unmatched };
}
