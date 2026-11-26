// Tests for who counts as vulnerable and how members are named.
import { describe, expect, it } from 'vitest';
import {
  describeGroup,
  describeMember,
  isVulnerable,
  isYoungChild,
  membersOf,
} from '../../../src/features/household/members.js';
import type { Member } from '../../../src/features/household/types.js';
import { sampleHousehold } from '../../support/samples.js';

const member = (ageGroup: Member['ageGroup'], flags: Member['flags'] = []): Member => ({
  id: 'm1',
  ageGroup,
  flags,
});

describe('isVulnerable', () => {
  it('follows the advisory: children, older people, pregnant women, heart or lung conditions and outdoor workers', () => {
    const ages: Member['ageGroup'][] = ['infant', 'child', 'teen', 'older_adult'];
    for (const age of ages) {
      expect(isVulnerable(member(age))).toBe(true);
    }
    expect(isVulnerable(member('adult'))).toBe(false);
    const flags: Member['flags'] = ['pregnant', 'asthma_or_lung', 'heart_condition', 'outdoor_worker'];
    for (const flag of flags) {
      expect(isVulnerable(member('adult', [flag]))).toBe(true);
    }
  });

  it('tells infants and children apart from teens for mask advice', () => {
    expect([member('infant'), member('child'), member('teen')].map(isYoungChild)).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe('describing members', () => {
  it('names a member by age and flags without any name', () => {
    expect(describeMember(member('child', ['asthma_or_lung']))).toBe('child with asthma or a lung condition');
    expect(describeMember(member('adult', ['pregnant']))).toBe('pregnant adult');
    expect(describeMember(member('adult', ['heart_condition', 'outdoor_worker']))).toBe(
      'adult with a heart condition and who works outdoors',
    );
    expect(describeMember(member('older_adult'))).toBe('older adult');
  });

  it('names one or two members and calls a larger group everyone going', () => {
    expect(describeGroup([member('infant')])).toBe('the baby');
    expect(describeGroup([member('teen'), member('adult')])).toBe('the teen and the adult');
    expect(describeGroup([member('adult'), member('adult'), member('adult')])).toBe('everyone going');
    expect(describeGroup([])).toBe('everyone going');
  });

  it('finds members by id in household order', () => {
    expect(membersOf(sampleHousehold(), ['m3', 'm1']).map((found) => found.id)).toEqual(['m1', 'm3']);
  });
});
