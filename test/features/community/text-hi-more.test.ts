// Tests for the Hindi lines of the indoor, staff, source and GRAP actions.
import { describe, expect, it } from 'vitest';
import { ACTIONS_EN_MORE } from '../../../src/features/community/text-en-more.js';
import { ACTIONS_EN_TIME } from '../../../src/features/community/text-en-time.js';
import { ACTIONS_HI_MORE } from '../../../src/features/community/text-hi-more.js';
import { placeholderMismatches, stringsIn, templateProblems, unknownPlaceholders } from './support.js';

describe('ACTIONS_HI_MORE', () => {
  it('is Devanagari without digits, nukta or em dash, with only placeholders that have values', () => {
    const strings = stringsIn(ACTIONS_HI_MORE);
    expect(templateProblems(strings, 'hi')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('uses the same placeholders as the English line of each action', () => {
    expect(placeholderMismatches({ ...ACTIONS_EN_TIME, ...ACTIONS_EN_MORE }, ACTIONS_HI_MORE)).toEqual([]);
  });

  it('finds an action missing from the English side', () => {
    expect(placeholderMismatches({}, { windows: ACTIONS_HI_MORE.windows })).toEqual([
      'windows school',
      'windows housing_society',
    ]);
  });
});
