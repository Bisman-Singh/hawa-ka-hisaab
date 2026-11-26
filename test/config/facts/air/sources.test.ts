// Tests for the source records behind the air facts.
import { describe, expect, it } from 'vitest';
import * as sources from '../../../../src/config/facts/air/sources.js';
import { sourceSchema } from '../../../../src/lib/schemas/facts.js';

describe('air sources', () => {
  it('are valid public https documents with a retrieval date', () => {
    const all = Object.values(sources);
    expect(all).toHaveLength(9);
    for (const source of all) {
      expect(sourceSchema.safeParse(source).success, source.title).toBe(true);
    }
    expect(sources.CPCB_FEED.url).toBe('https://airquality.cpcb.gov.in/caaqms/rss_feed');
    expect(sources.GRAP_ORDER.published).toBe('2026-11-17');
  });
});
