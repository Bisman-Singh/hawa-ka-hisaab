// Tests for the English templates of the timing and indoor actions.
import { describe, expect, it } from 'vitest';
import { ACTIONS_EN_TIME } from '../../../src/features/community/text-en-time.js';
import { stringsIn, templateProblems, unknownPlaceholders } from './support.js';

describe('ACTIONS_EN_TIME', () => {
  it('holds no digits, no em dash, no Devanagari and only placeholders that have values', () => {
    const strings = stringsIn(ACTIONS_EN_TIME);
    expect(templateProblems(strings, 'en')).toEqual([]);
    expect(unknownPlaceholders(strings)).toEqual([]);
  });

  it('tells a school there is no tested evidence on masks for children and keeps that off a society notice', () => {
    expect(ACTIONS_EN_TIME.masks.line.school).toContain(
      'No tested evidence shows how well masks protect children.',
    );
    expect(ACTIONS_EN_TIME.masks.line.housing_society).not.toContain('children');
  });

  it('takes the ventilation window from the advisory facts', () => {
    expect(ACTIONS_EN_TIME.windows.line.school).toContain('between {ventFrom} p.m. and {ventTo} p.m.');
    expect(ACTIONS_EN_TIME.windows.factIds.school).toContain('community-ventilation-until');
  });
});
