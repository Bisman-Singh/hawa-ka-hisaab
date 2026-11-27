// Tests for the household words on the plan screens: who and when in English and Hindi, titles in the plan's
// language, and the people in short with alike members counted together.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { activityTitle, fixityOf, peopleLine, whoLine } from '../../../src/ui/plan/plan-words.js';
import { sample } from '../../support/plan-fixtures.js';
import { need, planResponse } from './fixtures.js';

const household = sample('family-car-asthma');

const member = (id: string, ageGroup: Member['ageGroup'], flags: Member['flags'] = []): Member => ({
  id,
  ageGroup,
  flags,
});

describe('words for an item', () => {
  it('names the people and minutes, the fixity and where a moved item came from', () => {
    const { plan } = planResponse('family-car-asthma', 'poor');
    const commute = need(plan.slots.morning[0]);
    expect(whoLine(household, commute)).toMatch(/^adult, \d+ minutes$/);
    expect(whoLine(household, { ...commute, activityId: null })).toBe('adult');
    expect(fixityOf(household, commute)).toBe('fixed');
    expect(fixityOf(household, need(plan.slots.afternoon[0]))).toMatch(/^from \d\d:\d\d$/);
    expect(fixityOf(household, { ...commute, activityId: null })).toBe('can move');
  });

  it('says the same in Hindi on a Hindi plan', () => {
    const { plan } = planResponse('family-car-asthma', 'poor', { language: 'hi' });
    const commute = need(plan.slots.morning[0]);
    expect(whoLine(household, commute, 'hi')).toMatch(/^वयस्क, \d+ मिनट$/);
    expect(fixityOf(household, commute, 'hi')).toBe('तय');
    expect(fixityOf(household, need(plan.slots.afternoon[0]), 'hi')).toMatch(/^\d\d:\d\d से$/);
    expect(fixityOf(household, { ...commute, activityId: null }, 'hi')).toBe('बदल सकता है');
  });

  it('titles an activity by its own label in English and by its kind in Hindi', () => {
    const walk = need(household.activities.find((activity) => activity.kind === 'outdoor_exercise'));
    expect(activityTitle(household, walk, 'en')).toBe('Walk in the park');
    expect(activityTitle(household, walk, 'hi')).toBe('बाहर की कसरत');
  });
});

describe('peopleLine', () => {
  it('counts members described alike, so two adults read as 2 adults', () => {
    expect(
      peopleLine([member('m1', 'adult'), member('m2', 'adult'), member('m3', 'child', ['asthma_or_lung'])]),
    ).toBe('2 adults; child with asthma or a lung condition');
    expect(
      peopleLine([
        member('m1', 'adult', ['outdoor_worker']),
        member('m2', 'adult', ['outdoor_worker']),
        member('m3', 'older_adult'),
      ]),
    ).toBe('2 adults who work outdoors; older adult');
    expect(peopleLine([member('m1', 'adult', ['pregnant']), member('m2', 'adult', ['pregnant'])])).toBe(
      '2 pregnant adults',
    );
    expect(peopleLine([])).toBe('');
  });
});
