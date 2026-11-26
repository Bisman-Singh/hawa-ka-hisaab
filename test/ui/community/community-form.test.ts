// Tests for the community form logic: each sample survives a trip through the form unchanged, and every schema
// problem lands on the field that caused it.
import { describe, expect, it } from 'vitest';
import { COMMUNITY_SAMPLES } from '../../../src/features/community/samples.js';
import { EMPTY_FORM, formFrom, readForm } from '../../../src/ui/community/community-form.js';
import type { CommunityForm } from '../../../src/ui/community/community-form.js';

const problems = (form: CommunityForm) => {
  const read = readForm(form);
  return 'problems' in read ? read.problems : [];
};

describe('formFrom and readForm', () => {
  it('turn each sample into the form and back into the same input', () => {
    for (const sample of COMMUNITY_SAMPLES) {
      expect(readForm(formFrom(sample.input))).toEqual({ input: sample.input });
    }
  });

  it('send blank optional counts as null and no generator or gate idling when none is given', () => {
    const read = readForm({ ...EMPTY_FORM, count: '40' });
    expect(read).toEqual({
      input: {
        kind: 'housing_society',
        homes: 40,
        pupils: null,
        generator: null,
        wasteBurning: 'never',
        gateIdling: null,
        assembly: null,
        outdoorPeriods: [],
        children: null,
        olderAdults: null,
        outdoorStaff: null,
      },
    });
  });

  it('tie each problem to its field, and a missing count to the count', () => {
    expect(problems(EMPTY_FORM)).toEqual(['count']);
    expect(problems({ ...EMPTY_FORM, kind: 'school', count: '' })).toEqual(['count']);
    expect(problems({ ...EMPTY_FORM, count: 'many' })).toEqual(['count']);
    expect(problems({ ...EMPTY_FORM, count: '10', generator: 'diesel', hours: '30' })).toEqual(['hours']);
    expect(problems({ ...EMPTY_FORM, count: '10', vehicles: '20', idleMinutes: '' })).toEqual([
      'idleMinutes',
    ]);
    expect(problems({ ...EMPTY_FORM, count: '10', children: '-3' })).toEqual(['children']);
    expect(problems({ ...EMPTY_FORM, kind: 'school', count: '90', assembly: '7:5' })).toEqual(['assembly']);
    expect(problems({ ...EMPTY_FORM, count: '10', periods: [{ start: '10:00', minutes: '2' }] })).toEqual([
      'periods',
    ]);
  });

  it('leaves out the society counts for a school and the assembly for a society', () => {
    const read = readForm({ ...EMPTY_FORM, kind: 'school', count: '90', children: '5', assembly: '07:45' });
    expect(read).toMatchObject({ input: { pupils: 90, homes: null, assembly: '07:45' } });
    expect('input' in read && 'children' in read.input).toBe(false);
    expect(readForm({ ...EMPTY_FORM, count: '9', assembly: '07:45' })).toMatchObject({
      input: { assembly: null },
    });
  });
});
