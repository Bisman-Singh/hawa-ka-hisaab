// Tests for the source records of the household facts.
import { describe, expect, it } from 'vitest';
import * as sources from '../../../src/config/facts/sources.js';
import { sourceSchema } from '../../../src/lib/schemas/facts.js';

describe('sources', () => {
  it('are valid public https documents', () => {
    const all = Object.values(sources);
    expect(all.length).toBe(7);
    expect(sources.EPA_BREATHING.url).toBe(
      'https://www.epa.gov/sites/default/files/2015-09/documents/efh-chapter06.pdf',
    );
    expect(sources.GHG_ROAD.title).toMatch(/for stakeholder consultation/);
    expect(sources.GHG_RAIL.title).toMatch(/for stakeholder consultation/);
    expect(all.filter((source) => !sourceSchema.safeParse(source).success)).toEqual([]);
  });
});
