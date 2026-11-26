// Tests for the shared rules wording: names, quoted advice and the headline for each kind of day.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import {
  activityName,
  adviceFor,
  airToday,
  capitalise,
  headlineFor,
} from '../../../src/features/planner/text.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

const adult: Member = { id: 'm1', ageGroup: 'adult', flags: [] };
const child: Member = { id: 'm2', ageGroup: 'child', flags: [] };

describe('names', () => {
  it('use the label, or a plain name for the kind', () => {
    expect(activityName(testActivity())).toBe('football');
    expect(activityName(testActivity({ label: null, kind: 'school_run' }))).toBe('the school run');
    expect(capitalise('the school run')).toBe('The school run');
    expect(airToday('very_poor')).toBe('The air is very poor today.');
  });
});

describe('adviceFor', () => {
  it('quotes the vulnerable and the general advice for who is there, with the facts it quotes', () => {
    const both = adviceFor('poor', [adult, child]);
    expect(both.text).toBe(
      'Health ministry advice for the child: "Avoid outdoor physical activities". For everyone else: "Avoid outdoor physical exertion".',
    );
    expect(both.factIds).toEqual([
      'advice-poor-vulnerable',
      'advice-vulnerable-groups',
      'advice-poor-general',
    ]);
    expect(adviceFor('moderate', [adult]).text).toBe(
      'Health ministry advice: "Do less prolonged or strenuous outdoor physical exertion".',
    );
    expect(adviceFor(null, [adult])).toEqual({ text: '', factIds: [] });
  });
});

describe('headlineFor', () => {
  const headline = (members: Member[], band: Parameters<typeof planContext>[1]): string =>
    headlineFor(situationOf(planContext(testHousehold([], members), band)));

  it('says most things are fine on a mild day and that the air is unknown when it is', () => {
    expect(headline([adult], 'good')).toBe('The air is good today. Most things are fine as they are.');
    expect(headline([adult], null)).toMatch(/^We could not read the air/);
    expect(headline([adult], 'poor')).toMatch(/A few changes cut/);
  });

  it('leads a severe day with the people at risk, by name of group when there are many', () => {
    expect(headline([adult, child], 'severe')).toMatch(/Keep the child indoors/);
    const many = [child, { ...child, id: 'm3' }, { ...child, id: 'm4' }];
    expect(headline(many, 'severe')).toMatch(/Keep the people most at risk indoors/);
    expect(headline([adult], 'very_poor')).toMatch(/Avoid outdoor exertion/);
  });
});
