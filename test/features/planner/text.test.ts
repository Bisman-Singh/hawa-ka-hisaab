// Tests for the shared rules wording: names, quoted advice and the headline for each kind of day.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import type { Language } from '../../../src/lib/types.js';
import {
  activityName,
  adviceFor,
  airToday,
  capitalise,
  headlineFor,
  namesIn,
} from '../../../src/features/planner/text.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

const adult: Member = { id: 'm1', ageGroup: 'adult', flags: [] };
const child: Member = { id: 'm2', ageGroup: 'child', flags: [] };

const at = (band: Parameters<typeof planContext>[1], language: Language = 'en') =>
  situationOf({ ...planContext(testHousehold([testActivity()]), band), language });

describe('names', () => {
  it('use the label, or a plain name for the kind, and the kind in Hindi', () => {
    expect(activityName(testActivity())).toBe('football');
    expect(activityName(testActivity({ label: null, kind: 'school_run' }))).toBe('the school run');
    expect(capitalise('the school run')).toBe('The school run');
    expect(airToday(at('very_poor'), 'very_poor')).toBe('The air is very poor today.');
    expect(airToday(at('very_poor', 'hi'), 'very_poor')).toBe('आज हवा बहुत खराब श्रेणी में है।');
    expect(namesIn(at('poor'), testActivity())).toEqual({ name: 'football', Name: 'Football' });
    expect(namesIn(at('poor', 'hi'), testActivity()).name).toBe('बाहर का खेल');
  });
});

describe('adviceFor', () => {
  it('quotes the vulnerable and the general advice for who is there, with the facts it quotes', () => {
    const both = adviceFor(at('poor'), [adult, child]);
    expect(both.text).toBe(
      'Health ministry advice for the child: "Avoid outdoor physical activities". For everyone else: "Avoid outdoor physical exertion".',
    );
    expect(both.factIds).toEqual([
      'advice-poor-vulnerable',
      'advice-vulnerable-groups',
      'advice-poor-general',
    ]);
    expect(adviceFor(at('moderate'), [adult]).text).toBe(
      'Health ministry advice: "Do less prolonged or strenuous outdoor physical exertion".',
    );
    expect(adviceFor(at(null), [adult])).toEqual({ text: '', factIds: [] });
  });

  it('gives the advice in plain Hindi without quote marks in a Hindi plan', () => {
    const text = adviceFor(at('poor', 'hi'), [adult, child]).text;
    expect(text).toBe(
      'बच्चे के लिए स्वास्थ्य मंत्रालय की सलाह है कि बाहर की शारीरिक गतिविधियों से बचें। बाकी सभी के लिए सलाह है कि बाहर शारीरिक मेहनत से बचें।',
    );
    expect(text).not.toMatch(/["“”]/u);
  });
});

describe('headlineFor', () => {
  const headline = (members: Member[], band: Parameters<typeof planContext>[1]): string =>
    headlineFor(situationOf(planContext(testHousehold([], members), band)));

  it('says most things are fine on a mild day and that the air is unknown when it is', () => {
    expect(headline([adult], 'good')).toBe(
      'The air is good today. Most things are fine as they are, so the day can go ahead as planned.',
    );
    expect(headline([adult], null)).toMatch(/^We could not read the air/);
    expect(headline([adult], 'poor')).toMatch(/a few changes cut/);
    expect(headline([adult, child], 'moderate')).toMatch(/matter most for the child\.$/);
  });

  it('on a severe day tells someone who must work outdoors how to cut what they breathe in', () => {
    const worker: Member = { id: 'm1', ageGroup: 'adult', flags: ['outdoor_worker'] };
    const shift = testActivity({ kind: 'outdoor_work', timing: 'fixed', memberIds: ['m1'] });
    const s = situationOf(planContext(testHousehold([shift], [worker]), 'severe'));
    expect(headlineFor(s)).toMatch(/if the adult who works outdoors must work outside/);
    const off = situationOf(planContext(testHousehold([], [worker]), 'severe'));
    expect(headlineFor(off)).toMatch(/Keep the adult who works outdoors indoors/);
  });

  it('leads a severe day with the people at risk, by name of group when there are many', () => {
    expect(headline([adult, child], 'severe')).toMatch(/Keep the child indoors/);
    const many = [child, { ...child, id: 'm3' }, { ...child, id: 'm4' }];
    expect(headline(many, 'severe')).toMatch(/Keep the people most at risk indoors/);
    expect(headline([adult], 'very_poor')).toMatch(/Avoid outdoor exertion/);
  });
});
