// Reads facts for the community view from the one registry, so templates and figures take every number and quote
// from the fact tables, and names the fact numbers templates use.
import { findFact } from '../../config/facts/index.js';
import type { FactValue } from '../../lib/types.js';
import { formatNumber } from './format.js';
import { shown, type TemplateValue } from './template-value.js';

/** Which number of a number fact to take: its value or one end of its range. */
export type FactPick = 'value' | 'low' | 'high';

/**
 * A number from a fact, as a fact value. A fact without a range gives its value for any pick. An id
 * that is not a number fact is a coding error and throws.
 */
export function factValue(id: string, pick: FactPick): FactValue {
  const fact = findFact(id);
  if (fact?.kind !== 'number') {
    throw new Error(`not a community number fact: ${id}`);
  }
  const value = pick === 'value' ? fact.value : (fact.range?.[pick] ?? fact.value);
  return { id, label: fact.title, value, unit: fact.unit };
}

/** The verbatim text of a fact. An id that is not a text fact is a coding error and throws. */
export function factText(id: string): string {
  const fact = findFact(id);
  if (fact?.kind !== 'text') {
    throw new Error(`not a community text fact: ${id}`);
  }
  return fact.text;
}

const FROM_FACTS: Readonly<Record<string, readonly [string, FactPick]>> = {
  ventFrom: ['community-ventilation-from', 'value'],
  ventTo: ['community-ventilation-until', 'value'],
  n95: ['community-mask-class', 'low'],
  n99: ['community-mask-class', 'high'],
  n95Low: ['community-mask-n95-filtration', 'low'],
  n95High: ['community-mask-n95-filtration', 'high'],
  clothLow: ['community-mask-cloth-filtration', 'low'],
  clothHigh: ['community-mask-cloth-filtration', 'high'],
  leakLow: ['community-mask-fit-leakage', 'low'],
  leakHigh: ['community-mask-fit-leakage', 'high'],
  dgShare: ['community-share-dg-sets', 'value'],
  refuseShare: ['community-share-refuse-burning', 'value'],
  transportShare: ['community-share-transport', 'value'],
  studyYear: ['community-study-winter', 'value'],
};

/** The placeholder values that come straight from community number facts, such as {dgShare}. */
export function factPlaceholders(): Record<string, TemplateValue> {
  return Object.fromEntries(
    Object.entries(FROM_FACTS).map(([name, [id, pick]]) => {
      const fact = factValue(id, pick);
      return [name, shown(formatNumber(fact.value), [fact])];
    }),
  );
}
