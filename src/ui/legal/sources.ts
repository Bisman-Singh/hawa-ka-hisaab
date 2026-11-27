// The sources the about-the-data page lists: every document the facts registry cites, once each.
import { FACT_LIST } from '../../config/facts/index.js';
import type { Source } from '../../lib/types.js';

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
