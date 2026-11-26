// Tests for the per-activity rules: fine on a mild day, indoors or moved on a bad one, protected when fixed.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { activityActions } from '../../../src/features/planner/activity-actions.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { flatDay, planContext, testActivity, testHousehold } from '../../support/plan-fixtures.js';
import { hourCurve } from '../../support/fake-air.js';

const child: Member = { id: 'm1', ageGroup: 'child', flags: ['asthma_or_lung'] };
const kinds = (band: Parameters<typeof planContext>[1], members?: Member[]) =>
  activityActions(
    situationOf(planContext(testHousehold([testActivity()], members), band)),
    testActivity(),
  ).map((a) => a.kind);

describe('activityActions', () => {
  it('says an outdoor activity is fine on a mild day and that the air is unknown when it is', () => {
    expect(kinds('satisfactory')).toEqual(['reassure']);
    const [unknown] = activityActions(
      situationOf(planContext(testHousehold([testActivity()]), null)),
      testActivity(),
    );
    expect(unknown?.template.title).toBe('Football: no air reading yet');
    expect(unknown?.factIds).toEqual([]);
  });

  it('gives nothing for an indoor activity with no travel', () => {
    const inside = testActivity({ setting: 'indoor' });
    expect(activityActions(situationOf(planContext(testHousehold([inside]), 'severe')), inside)).toEqual([]);
  });

  it('prefers indoors for exercise on a severe band, and for vulnerable members on any severe day', () => {
    expect(kinds('severe')).toEqual(['move_indoors', 'reschedule', 'protect']);
    expect(kinds('very_poor')).toEqual(['reschedule', 'protect']);
    expect(kinds('very_poor', [child])).toEqual(['move_indoors', 'reschedule', 'protect']);
    expect(kinds('moderate')).toEqual(['reschedule', 'protect']);
  });

  it('suggests a move only when the forecast has cleaner hours, with toggles an hour either side', () => {
    const s = situationOf(planContext(testHousehold([testActivity()]), 'poor'));
    const [move] = activityActions(s, testActivity());
    expect(move).toMatchObject({ id: 'move-a1', start: '14:00', slot: 'afternoon' });
    expect(move?.whatIfs.map((toggle) => toggle.label)).toEqual(['Start at 13:00', 'Start at 15:00']);
    const zero = situationOf(planContext(testHousehold([testActivity()]), 'poor', hourCurve(flatDay(0))));
    expect(activityActions(zero, testActivity()).map((a) => a.kind)).toEqual(['protect']);
    const unknown = situationOf(planContext(testHousehold([testActivity()]), 'poor', null));
    expect(activityActions(unknown, testActivity()).map((a) => a.kind)).toEqual(['protect']);
  });

  it('tells vulnerable members on a severe day to go only if it cannot wait', () => {
    const errand = testActivity({ kind: 'errand', label: 'market' });
    const s = situationOf(planContext(testHousehold([errand], [child]), 'very_poor'));
    expect(activityActions(s, errand)[0]?.template.why).toMatch(/^If it cannot wait/);
  });
});
