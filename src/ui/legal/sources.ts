// The sources the about-the-data page lists: every document the facts registry cites, once each, and the
// data.gov.in credit dated as its licence template asks.
import { FACT_LIST, factQuote } from '../../config/facts/index.js';
import type { Source } from '../../lib/types.js';

const IST_OFFSET_MS = 330 * 60_000;
const DATE_SLOT = '{dd/mm}';

/** Every source the registry cites, once each by address, in the registry's order. */
export function citedSources(): Source[] {
  const seen = new Map<string, Source>();
  for (const fact of FACT_LIST) {
    if (!seen.has(fact.source.url)) {
      seen.set(fact.source.url, fact.source);
    }
  }
  return [...seen.values()];
}

/** The day and month of an instant in India, as dd/mm. */
export function dayMonth(instant: string): string {
  const day = new Date(Date.parse(instant) + IST_OFFSET_MS);
  const two = (value: number): string => String(value).padStart(2, '0');
  return `${two(day.getUTCDate())}/${two(day.getUTCMonth() + 1)}`;
}

/** The data.gov.in credit line from the registry for data read at an instant, its date slot filled where it has one. */
export function dataGovCredit(instant: string): string {
  return factQuote('credit-data-gov-in').replace(DATE_SLOT, dayMonth(instant));
}
