// Tests for the notice's words: no digits, em dashes or wrong script, only placeholders that have values, the same
// placeholders in the English and Hindi line of each action, the CPCB band names and the claims the words make.
import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  ADVICE_HI,
  BAND_HI_BEFORE_NOUN,
  BAND_NAMES,
  forKind,
  FRAMES,
} from '../../../src/features/community/words.js';
import type { CommunityKind } from '../../../src/features/community/types.js';
import { placeholderMismatches, stringsIn, templateProblems, unknownPlaceholders } from './support.js';

const english = Object.values(ACTIONS).flatMap((action) => [action.title, action.line.en, action.detail]);

describe('forKind', () => {
  it('gives one value for both kinds, or the value of the kind asked for', () => {
    expect(forKind('x', 'school')).toBe('x');
    expect(forKind({ school: 'a', housing_society: 'b' }, 'housing_society')).toBe('b');
    expect(forKind(['f1'], 'school')).toEqual(['f1']);
  });
});

describe('the English words', () => {
  it('hold no digits, no em dash, no Devanagari and only placeholders that have values', () => {
    const strings = [...stringsIn(english), ...stringsIn(BAND_NAMES.en), ...stringsIn(FRAMES.en)];
    expect(templateProblems(strings, 'en')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('cite at least one fact for each kind of community', () => {
    for (const action of Object.values(ACTIONS)) {
      expect(forKind(action.factIds, 'school').length).toBeGreaterThan(0);
      expect(forKind(action.factIds, 'housing_society').length).toBeGreaterThan(0);
    }
  });

  it('use the CPCB band names', () => {
    expect(Object.values(BAND_NAMES.en)).toEqual([
      'Good',
      'Satisfactory',
      'Moderate',
      'Poor',
      'Very Poor',
      'Severe',
    ]);
  });

  it('state that each city share is for Delhi in one winter and not for this place', () => {
    expect(forKind(ACTIONS['generator-essential'].detail, 'school')).toContain('not for this generator');
    expect(forKind(ACTIONS['no-idling'].detail, 'housing_society')).toContain(
      'no cited figure gives idling alone',
    );
  });

  it('say the notice is general guidance and label the modelled path as an estimate', () => {
    const kinds: readonly CommunityKind[] = ['school', 'housing_society'];
    for (const kind of kinds) {
      expect(forKind(FRAMES.en.closing, kind)).toContain('It is general guidance, not medical advice.');
    }
    expect(FRAMES.en.reading.modelled).toContain('is not a measurement and tends to read low in cities');
  });

  it('tell a school there is no tested evidence on masks for children and keep that off a society notice', () => {
    expect(forKind(ACTIONS.masks.line.en, 'school')).toContain(
      'No tested evidence shows how well masks protect children.',
    );
    expect(forKind(ACTIONS.masks.line.en, 'housing_society')).not.toContain('children');
  });

  it('take the ventilation window from the advisory facts', () => {
    expect(forKind(ACTIONS.windows.line.en, 'school')).toContain('between {ventFrom} p.m. and {ventTo} p.m.');
    expect(forKind(ACTIONS.windows.factIds, 'school')).toContain('community-ventilation-until');
  });
});

describe('the Hindi words', () => {
  it('are Devanagari without digits, nukta or em dash, with only placeholders that have values', () => {
    const lines = Object.values(ACTIONS).map((action) => action.line.hi);
    const strings = [
      ...stringsIn(lines),
      ...stringsIn(ADVICE_HI),
      ...stringsIn(BAND_NAMES.hi),
      ...stringsIn(BAND_HI_BEFORE_NOUN),
      ...stringsIn(FRAMES.hi),
    ];
    expect(templateProblems(strings, 'hi')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('use the same placeholders as the English line of each action, so both show the same numbers', () => {
    expect(placeholderMismatches(ACTIONS)).toEqual([]);
    const broken = { windows: { ...ACTIONS.windows, line: { en: '{ventFrom}', hi: 'खिड़की' } } };
    expect(placeholderMismatches(broken)).toEqual(['windows school', 'windows housing_society']);
  });

  it('use the CPCB Hindi band names, and the agreeing form before हवा or श्रेणी, never in quote marks', () => {
    expect(Object.values(BAND_NAMES.hi)).toEqual(['अच्छा', 'संतोषजनक', 'मध्यम', 'खराब', 'बहुत खराब', 'गंभीर']);
    expect(Object.values(BAND_HI_BEFORE_NOUN)).toEqual([
      'अच्छी',
      'संतोषजनक',
      'मध्यम',
      'खराब',
      'बहुत खराब',
      'गंभीर',
    ]);
    const lines = [
      FRAMES.hi.reading.station,
      FRAMES.hi.reading.modelled,
      forKind(ACTIONS['health-advice'].line.hi, 'school'),
    ];
    expect(lines.every((line) => line.includes('{band}') && !/["“”]/.test(line))).toBe(true);
  });
});
