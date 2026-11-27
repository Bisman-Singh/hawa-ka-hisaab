// Tests for the airing window and purifier sizing steps.
import { describe, expect, it } from 'vitest';
import type { Household, Room } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { indoorSteps } from '../../../src/features/planner/indoor.js';
import { flatDay, planContext, testHousehold, winterDay } from '../../support/plan-fixtures.js';
import { hourCurve } from '../../support/fake-air.js';

const withRooms = (rooms: Room[]): Household => ({
  ...testHousehold([]),
  home: { rooms, cookingFuel: 'lpg', indoorSources: [] },
});
const room = (id: string, kind: Room['kind'], purifier: Room['purifier']): Room => ({
  id,
  kind,
  areaSqFt: 120,
  purifier,
});

describe('the airing window', () => {
  it('picks the cleanest early afternoon hour on a poor day, with its change against the shut hours', () => {
    const [step] = indoorSteps(situationOf(planContext(withRooms([]), 'poor')));
    expect(step).toMatchObject({ id: 'ventilate', window: { start: '14:00', end: '15:00' } });
    expect(step?.figure?.value).toBeLessThan(0);
  });

  it('falls back to the advisory window with no forecast, and shows no figure without the shut hours', () => {
    const [none] = indoorSteps(situationOf(planContext(withRooms([]), 'severe', null)));
    expect(none).toMatchObject({ window: { start: '12:00', end: '16:00' }, figure: null });
    const afternoonOnly = winterDay().map((value, hour) => (hour >= 12 && hour < 16 ? value : -1));
    const curve = hourCurve(afternoonOnly);
    const trimmed = { ...curve, hours: curve.hours.filter((row) => (row.pm25 ?? -1) >= 0) };
    expect(indoorSteps(situationOf(planContext(withRooms([]), 'poor', trimmed)))[0]?.figure).toBeNull();
    expect(
      indoorSteps(situationOf(planContext(withRooms([]), 'poor', hourCurve(flatDay(0)))))[0]?.figure,
    ).toBeNull();
  });

  it('on a moderate day only names the cleanest early afternoon hour, with no restriction', () => {
    const [step] = indoorSteps(situationOf(planContext(withRooms([]), 'moderate')));
    expect(step).toMatchObject({ id: 'ventilate', window: { start: '14:00', end: '15:00' }, figure: null });
    expect(step?.title).toBe('If you air the rooms, the cleanest early afternoon hour is 14:00 to 15:00');
    expect(step?.detail).toContain('only on poor to severe days');
  });

  it('on a mild day says the windows can open whenever, and with unknown air says nothing', () => {
    const [mild] = indoorSteps(situationOf(planContext(withRooms([]), 'good')));
    expect(mild).toMatchObject({ id: 'ventilate', title: 'Open the windows when you like', window: null });
    const unknown = indoorSteps(situationOf(planContext(withRooms([]), null)));
    expect(unknown.map((step) => step.id)).not.toContain('ventilate');
    const flat = indoorSteps(situationOf(planContext(withRooms([]), 'moderate', null)));
    expect(flat.map((step) => step.id)).not.toContain('ventilate');
  });
});

describe('purifier steps', () => {
  it('size rooms with an area, bedrooms first, at most three, and judge a purifier already there', () => {
    const rooms = [
      room('r1', 'living', { cadrM3PerHour: 300 }),
      room('r2', 'bedroom', null),
      room('r3', 'study', { cadrM3PerHour: 50 }),
      room('r4', 'kitchen', { cadrM3PerHour: null }),
      { ...room('r5', 'other', null), areaSqFt: null },
    ];
    const steps = indoorSteps(situationOf(planContext(withRooms(rooms), 'poor'))).filter(
      (step) => step.topic === 'purifier',
    );
    expect(steps.map((step) => step.roomId)).toEqual(['r2', 'r1', 'r3']);
    expect(steps.map((step) => step.detail.split('.')[0])).toEqual([
      'A purifier for this room needs at least the CADR shown',
      'Your purifier meets the size shown',
      'Your purifier is smaller than this room needs',
    ]);
    const unknown = indoorSteps(
      situationOf(planContext(withRooms([rooms[3] ?? room('x', 'other', null)]), 'poor')),
    );
    expect(unknown.find((step) => step.topic === 'purifier')?.detail).toMatch(/^Check the CADR/);
  });

  it('on a better day, only check purifiers already in the home', () => {
    const rooms = [room('r1', 'living', { cadrM3PerHour: 300 }), room('r2', 'bedroom', null)];
    const steps = indoorSteps(situationOf(planContext(withRooms(rooms), 'satisfactory')));
    expect(steps.filter((step) => step.topic === 'purifier').map((step) => step.roomId)).toEqual(['r1']);
    expect(steps.find((step) => step.topic === 'purifier')?.factIds).not.toContain('advice-purifier-days');
  });
});
