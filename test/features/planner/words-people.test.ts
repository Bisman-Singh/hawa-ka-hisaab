// Tests for words for people: Hindi puts the condition first and uses the forms that go before के लिए.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { PEOPLE_EN, PEOPLE_HI } from '../../../src/features/planner/words-people.js';

const member = (overrides: Partial<Member>): Member => ({
  id: 'm1',
  ageGroup: 'adult',
  flags: [],
  ...overrides,
});

describe('people words', () => {
  it('describe a member in each language', () => {
    expect(PEOPLE_EN.member(member({ flags: ['outdoor_worker'] }))).toBe('adult who works outdoors');
    expect(PEOPLE_HI.member(member({ flags: ['outdoor_worker'] }))).toBe('बाहर काम करने वाले वयस्क');
    expect(PEOPLE_HI.member(member({ flags: ['pregnant'] }))).toBe('गर्भवती महिला');
    expect(
      PEOPLE_HI.member(member({ ageGroup: 'older_adult', flags: ['asthma_or_lung', 'heart_condition'] })),
    ).toBe('दमा या फेफड़ों की बीमारी वाले और दिल की बीमारी वाले बुजुर्ग');
    expect(PEOPLE_HI.member(member({ ageGroup: 'infant' }))).toBe('शिशु');
  });

  it('have a plural for every age group', () => {
    expect(Object.keys(PEOPLE_HI.plural).sort()).toEqual(Object.keys(PEOPLE_EN.plural).sort());
    expect(PEOPLE_EN.plural.child).toBe('children');
  });
});
