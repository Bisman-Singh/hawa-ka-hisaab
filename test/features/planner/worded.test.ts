// Tests for which candidates the model words: at most twelve activities, vulnerable people's first, the rest kept
// for the rules templates, so a large household never makes a large request.
import { describe, expect, it } from 'vitest';
import type { Activity, Member } from '../../../src/features/household/types.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import {
  MAX_WORDED_ACTIVITIES,
  unwordedChoice,
  wordedActions,
  wordedActivityIds,
} from '../../../src/features/planner/worded.js';
import { planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';

const adult: Member = { id: 'm1', ageGroup: 'adult', flags: [] };
const child: Member = { id: 'm2', ageGroup: 'child', flags: [] };
const many: Activity[] = Array.from({ length: 20 }, (_, index) =>
  testActivity({ id: `a${String(index + 1)}`, memberIds: [index === 19 ? 'm2' : 'm1'], start: '18:00' }),
);

describe('wordedActivityIds', () => {
  it('keeps at most twelve activities, the vulnerable first, then in household order', () => {
    const ids = wordedActivityIds(testHousehold(many, [adult, child]));
    expect(ids.size).toBe(MAX_WORDED_ACTIVITIES);
    expect(ids.has('a20')).toBe(true);
    expect(ids.has('a1')).toBe(true);
    expect(ids.has('a12')).toBe(false);
  });
});

describe('wordedActions and unwordedChoice', () => {
  it('split the candidates between the model and the rules, losing none of the rules choice', () => {
    const household = testHousehold(many, [adult, child]);
    const set = buildCandidates(planContext(household, 'poor'));
    const worded = wordedActions(set, household);
    const rest = unwordedChoice(set, household);
    const ids = wordedActivityIds(household);
    expect(worded.every((action) => action.activityId === null || ids.has(action.activityId))).toBe(true);
    expect(rest.every((action) => action.activityId !== null && !ids.has(action.activityId))).toBe(true);
    expect(new Set(rest.map((action) => action.activityId)).size).toBe(20 - MAX_WORDED_ACTIVITIES);
  });
});
