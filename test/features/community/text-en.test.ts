// Tests for the English templates of the day's actions, the shared template types and the band names.
import { describe, expect, it } from 'vitest';
import { ACTIONS_EN_DAY, BAND_EN, same } from '../../../src/features/community/text-en.js';
import { stringsIn, templateProblems, unknownPlaceholders } from './support.js';

describe('same', () => {
  it('gives a school and a society the same value', () => {
    expect(same('x')).toEqual({ school: 'x', housing_society: 'x' });
  });
});

describe('ACTIONS_EN_DAY and BAND_EN', () => {
  it('hold no digits, no em dash, no Devanagari and only placeholders that have values', () => {
    const strings = [...stringsIn(ACTIONS_EN_DAY), ...stringsIn(BAND_EN)];
    expect(templateProblems(strings, 'en')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('cite at least one fact for each kind of community', () => {
    for (const text of Object.values(ACTIONS_EN_DAY)) {
      expect(text.factIds.school.length).toBeGreaterThan(0);
      expect(text.factIds.housing_society.length).toBeGreaterThan(0);
    }
  });

  it('use the CPCB band names', () => {
    expect(Object.values(BAND_EN)).toEqual([
      'Good',
      'Satisfactory',
      'Moderate',
      'Poor',
      'Very Poor',
      'Severe',
    ]);
  });
});
