// Tests for the sample communities: valid inputs, no names, and a full report for each on a severe day.
import { describe, expect, it } from 'vitest';
import { buildCommunityReport } from '../../../src/features/community/report.js';
import { COMMUNITY_SAMPLES } from '../../../src/features/community/samples.js';
import { communityInputSchema } from '../../../src/features/community/schemas.js';
import { context } from './support.js';

describe('COMMUNITY_SAMPLES', () => {
  it('holds a society and a school, each a valid input with a unique id', () => {
    expect(COMMUNITY_SAMPLES.map((sample) => sample.input.kind)).toEqual(['housing_society', 'school']);
    expect(
      COMMUNITY_SAMPLES.filter((sample) => !communityInputSchema.safeParse(sample.input).success),
    ).toEqual([]);
    expect(new Set(COMMUNITY_SAMPLES.map((sample) => sample.id)).size).toBe(COMMUNITY_SAMPLES.length);
  });

  it('describes each by make-up, starting with a plain article and holding no proper names', () => {
    for (const sample of COMMUNITY_SAMPLES) {
      expect(sample.description).toMatch(/^A /);
      expect(sample.description.slice(2)).not.toMatch(/[A-Z]/);
    }
  });

  it('gives each a full notice in both languages', () => {
    for (const sample of COMMUNITY_SAMPLES) {
      const report = buildCommunityReport(context({ community: sample.input }));
      expect(report.notice.hi?.lines.length).toBe(report.notice.en.lines.length);
      expect(report.actions.length).toBeGreaterThan(5);
    }
  });
});
