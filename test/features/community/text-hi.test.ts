// Tests for the Hindi frame, band names, advice and the day's action lines.
import { describe, expect, it } from 'vitest';
import { ACTIONS_EN_TIME } from '../../../src/features/community/text-en-time.js';
import { ACTIONS_EN_DAY } from '../../../src/features/community/text-en.js';
import {
  ACTIONS_HI_DAY,
  ADVICE_HI,
  BAND_HI,
  BAND_HI_BEFORE_NOUN,
  FRAME_HI,
} from '../../../src/features/community/text-hi.js';
import { placeholderMismatches, stringsIn, templateProblems, unknownPlaceholders } from './support.js';

describe('Hindi day text', () => {
  it('is Devanagari without digits, nukta or em dash, with only placeholders that have values', () => {
    const strings = [
      ...stringsIn(ACTIONS_HI_DAY),
      ...stringsIn(ADVICE_HI),
      ...stringsIn(BAND_HI),
      ...stringsIn(BAND_HI_BEFORE_NOUN),
      ...stringsIn(FRAME_HI),
    ];
    expect(templateProblems(strings, 'hi')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('uses the same placeholders as the English line of each action, so both show the same numbers', () => {
    expect(placeholderMismatches({ ...ACTIONS_EN_DAY, ...ACTIONS_EN_TIME }, ACTIONS_HI_DAY)).toEqual([]);
  });

  it('uses the CPCB Hindi band names', () => {
    expect(Object.values(BAND_HI)).toEqual(['अच्छा', 'संतोषजनक', 'मध्यम', 'खराब', 'बहुत खराब', 'गंभीर']);
  });

  it('names a band before हवा or श्रेणी in the agreeing form, never in quote marks', () => {
    expect(Object.values(BAND_HI_BEFORE_NOUN)).toEqual([
      'अच्छी',
      'संतोषजनक',
      'मध्यम',
      'खराब',
      'बहुत खराब',
      'गंभीर',
    ]);
    const lines = [
      FRAME_HI.reading.station,
      FRAME_HI.reading.modelled,
      ACTIONS_HI_DAY['health-advice'].school,
    ];
    expect(lines.every((line) => line.includes('{band}') && !/["“”]/.test(line))).toBe(true);
  });
});
