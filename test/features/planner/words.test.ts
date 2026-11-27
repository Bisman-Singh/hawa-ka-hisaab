// Tests for the plan's words: templates fill, activities are named in each language, groups read naturally.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { groupOf, lexiconFor, nameOf, say } from '../../../src/features/planner/words.js';
import { testActivity, testHousehold } from '../../support/plan-fixtures.js';

const en = lexiconFor('en');
const hi = lexiconFor('hi');
const child: Member = { id: 'm2', ageGroup: 'child', flags: ['asthma_or_lung'] };
const grandma: Member = { id: 'm3', ageGroup: 'older_adult', flags: ['heart_condition'] };
const grandpa: Member = { id: 'm4', ageGroup: 'older_adult', flags: [] };

describe('say', () => {
  it('fills a template in the lexicon language', () => {
    expect(say(en, 'toggle_start', { time: '14:00' })).toBe('Start at 14:00');
    expect(say(hi, 'toggle_start', { time: '14:00' })).toBe('14:00 बजे शुरू करें');
  });
});

describe('nameOf', () => {
  it('uses the household label in English and the kind in Hindi, told apart by time when two share a kind', () => {
    const play = testActivity();
    const household = testHousehold([play]);
    expect(nameOf(en, household, play)).toBe('football');
    expect(nameOf(hi, household, play)).toBe('बाहर का खेल');
    const evening = testActivity({ id: 'a2', label: null, start: '19:00' });
    const twins = testHousehold([testActivity({ label: null }), evening]);
    expect(nameOf(en, twins, evening)).toBe('outdoor play at 19:00');
    expect(nameOf(hi, twins, evening)).toBe('बाहर का खेल, 19:00 बजे');
  });
});

describe('groupOf', () => {
  it('names one or two people, puts a pair of the same age together and calls a crowd everyone going', () => {
    expect(groupOf(en, [child])).toBe('the child with asthma or a lung condition');
    expect(groupOf(en, [child, grandma])).toBe(
      'the child with asthma or a lung condition and the older adult with a heart condition',
    );
    expect(groupOf(en, [grandma, grandpa])).toBe('the two older adults');
    expect(groupOf(en, [child, grandma, grandpa])).toBe('everyone going');
    expect(groupOf(en, [])).toBe('everyone going');
    expect(groupOf(hi, [grandma, grandpa])).toBe('दोनों बुजुर्गों');
    expect(groupOf(hi, [child])).toBe('दमा या फेफड़ों की बीमारी वाले बच्चे');
  });
});
