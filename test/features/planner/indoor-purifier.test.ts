// Tests for purifier steps: sized rooms with a verdict on the purifier there, and an ask for the size of a room
// whose purifier has nothing to be checked against.
import { describe, expect, it } from 'vitest';
import type { Household, Room } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { purifierSteps } from '../../../src/features/planner/indoor-purifier.js';
import { planContext } from '../../support/plan-fixtures.js';

const home = (rooms: Room[]): Household => ({
  members: [{ id: 'm1', ageGroup: 'adult', flags: [] }],
  activities: [],
  home: { rooms, cookingFuel: 'lpg', indoorSources: [] },
});

describe('purifierSteps', () => {
  it('asks for the room size when a purifier has no area to size it against, on any day', () => {
    const rooms: Room[] = [{ id: 'r1', kind: 'living', areaSqFt: null, purifier: { cadrM3PerHour: null } }];
    const [step] = purifierSteps(situationOf(planContext(home(rooms), 'moderate')));
    expect(step).toMatchObject({
      id: 'purifier-r1',
      title: 'Purifier in the living room: add the room size',
      figure: null,
    });
    expect(step?.detail).toMatch(/With the floor area in sq ft/);
  });

  it('sizes a room with an area, says when the purifier is too small, and in Hindi names the room', () => {
    const rooms: Room[] = [{ id: 'r1', kind: 'bedroom', areaSqFt: 200, purifier: { cadrM3PerHour: 50 } }];
    const [step] = purifierSteps(situationOf(planContext(home(rooms), 'moderate')));
    expect(step?.detail).toMatch(/^Your purifier is smaller than this room needs\./);
    const hindi = purifierSteps(situationOf({ ...planContext(home(rooms), 'poor'), language: 'hi' }));
    expect(hindi[0]?.title).toBe('सोने के कमरे के लिए प्यूरीफायर का साइज');
    const none = home([{ id: 'r2', kind: 'study', areaSqFt: 120, purifier: null }]);
    expect(purifierSteps(situationOf(planContext(none, 'moderate')))).toEqual([]);
  });
});
