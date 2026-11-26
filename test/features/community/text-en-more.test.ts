// Tests for the English templates of the source, staff and GRAP actions and the English notice frame.
import { describe, expect, it } from 'vitest';
import { ACTIONS_EN_MORE, FRAME_EN } from '../../../src/features/community/text-en-more.js';
import { stringsIn, templateProblems, unknownPlaceholders } from './support.js';

describe('ACTIONS_EN_MORE and FRAME_EN', () => {
  it('hold no digits, no em dash, no Devanagari and only placeholders that have values', () => {
    const strings = [...stringsIn(ACTIONS_EN_MORE), ...stringsIn(FRAME_EN)];
    expect(templateProblems(strings, 'en')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('states that each city share is for Delhi in one winter and not for this place', () => {
    expect(ACTIONS_EN_MORE['generator-essential'].detail.school).toContain('not for this generator');
    expect(ACTIONS_EN_MORE['no-idling'].detail.housing_society).toContain(
      'no cited figure gives idling alone',
    );
  });

  it('says in the closing line that the notice is general guidance and not medical advice', () => {
    expect(FRAME_EN.closing.school).toContain('It is general guidance, not medical advice.');
    expect(FRAME_EN.closing.housing_society).toContain('It is general guidance, not medical advice.');
  });

  it('labels the modelled path as an estimate that is not a measurement', () => {
    expect(FRAME_EN.reading.modelled).toContain('is not a measurement and tends to read low in cities');
  });
});
