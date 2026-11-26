// The registry of every sourced fact the app can show, and lookup by id. Code cites facts only through here.
import type { Fact, Range } from '../../lib/types.js';
import { HOME_ADVICE_FACTS } from './advice-home.js';
import { ADVICE_FACTS } from './advice.js';
import { EXPOSURE_FACTS } from './exposure.js';
import { INDOOR_FACTS } from './indoor.js';
import { MASK_FACTS } from './masks.js';
import { TRAVEL_FACTS } from './travel.js';

/** Every fact in one list, in table order. */
export const FACT_LIST: readonly Fact[] = [
  ...ADVICE_FACTS,
  ...HOME_ADVICE_FACTS,
  ...TRAVEL_FACTS,
  ...EXPOSURE_FACTS,
  ...MASK_FACTS,
  ...INDOOR_FACTS,
  // The air facts, with the NAQI table, health statements, GRAP and data credits, join on the next line.
];

const BY_ID: ReadonlyMap<string, Fact> = new Map(FACT_LIST.map((fact) => [fact.id, fact]));

/** The fact with this id, or null when there is none. */
export function findFact(id: string): Fact | null {
  return BY_ID.get(id) ?? null;
}

/** A number fact's value and range. A missing or non-number id is a programming error and throws. */
export function factNumber(id: string): { readonly value: number; readonly range: Range | null } {
  const fact = BY_ID.get(id);
  if (fact?.kind !== 'number') {
    throw new Error(`no number fact ${id}`);
  }
  return { value: fact.value, range: fact.range };
}

/** The ends of a number fact: its range when it has one, or its single value. */
export function factEnds(id: string): readonly number[] {
  const { value, range } = factNumber(id);
  return range ? [range.low, range.high] : [value];
}

/** A quoted fact's text. A missing or non-text id is a programming error and throws. */
export function factQuote(id: string): string {
  const fact = BY_ID.get(id);
  if (fact?.kind !== 'text') {
    throw new Error(`no quoted fact ${id}`);
  }
  return fact.text;
}
