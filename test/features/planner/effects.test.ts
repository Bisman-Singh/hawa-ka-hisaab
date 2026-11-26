// Tests for slots, effects between two versions of an activity, and the search for the cleanest start.
import { describe, expect, it } from 'vitest';
import type { Fuel, TravelMode } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import {
  cleanestStart,
  effectsBetween,
  nearbyStarts,
  slotOf,
} from '../../../src/features/planner/effects.js';
import { flatDay, planContext, testActivity, testHousehold, winterDay } from '../../support/plan-fixtures.js';
import { hourCurve } from '../../support/fake-air.js';

const BUS: TravelMode = 'bus';
const CAR: TravelMode = 'car';
const PETROL: Fuel = 'petrol';

describe('slotOf', () => {
  it('uses the slot start hours, with the night counted as evening', () => {
    expect([299, 300, 719, 720, 1019, 1020, 1439, 1500].map(slotOf)).toEqual([
      'evening',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
      'evening',
    ]);
  });
});

describe('nearbyStarts', () => {
  it('keeps the hour either side inside the move window', () => {
    expect(nearbyStarts(840, 60)).toEqual([780, 900]);
    expect(nearbyStarts(360, 60)).toEqual([420]);
    expect(nearbyStarts(1200, 60)).toEqual([1140]);
  });
});

describe('effectsBetween', () => {
  const car = testActivity({
    kind: 'commute',
    setting: 'in_transit',
    travel: { mode: 'car', fuel: 'petrol', distanceKm: 10, occupancy: 1, roundTrip: true },
  });
  const s = situationOf(planContext(testHousehold([car]), 'poor'));

  it('gives a shift effect for a new start and both CO2 and breathing for a new mode', () => {
    expect(effectsBetween(s, car, { ...car, start: '14:00' }).map((effect) => effect.kind)).toEqual([
      'exposure',
    ]);
    const bus = { ...car, travel: { mode: BUS, fuel: null, distanceKm: 10, occupancy: 1, roundTrip: true } };
    expect(effectsBetween(s, car, bus).map((effect) => effect.kind)).toEqual(['co2', 'exposure']);
  });

  it('gives only CO2 for a new occupancy and nothing when nothing changes', () => {
    const pooled = {
      ...car,
      travel: { mode: CAR, fuel: PETROL, distanceKm: 10, occupancy: 2, roundTrip: true },
    };
    expect(effectsBetween(s, car, pooled).map((effect) => effect.kind)).toEqual(['co2']);
    expect(effectsBetween(s, car, { ...car })).toEqual([]);
    expect(effectsBetween(s, testActivity(), testActivity({ setting: 'indoor' }))).toEqual([]);
  });

  it('gives no shift without a forecast, and drops nearby hours the forecast does not cover', () => {
    const none = situationOf(planContext(testHousehold([testActivity()]), 'poor', null));
    expect(effectsBetween(none, testActivity(), testActivity({ start: '14:00' }))).toEqual([]);
    const curve = hourCurve(winterDay());
    const holes = { ...curve, hours: curve.hours.filter((_, hour) => hour !== 13 && hour !== 15) };
    const gappy = situationOf(planContext(testHousehold([testActivity()]), 'poor', holes));
    const [effect] = effectsBetween(gappy, testActivity(), testActivity({ start: '14:00' }));
    expect(effect?.working.inputs).toHaveLength(2);
  });

  it('moving to an hour with the same forecast value changes nothing', () => {
    const flat = situationOf(planContext(testHousehold([testActivity()]), 'poor', hourCurve(flatDay(180))));
    const [effect] = effectsBetween(flat, testActivity(), testActivity({ start: '13:00' }));
    expect(effect?.kind === 'exposure' && effect.change).toEqual({ low: 0, high: 0 });
  });
});

describe('cleanestStart', () => {
  it('finds the cleanest whole hour in the window', () => {
    const s = situationOf(planContext(testHousehold([testActivity()]), 'poor'));
    expect(cleanestStart(s, testActivity())).toBe(840);
  });

  it("avoids the members' other activities and respects the earliest start", () => {
    const busy = testActivity({ id: 'a2', start: '13:30', timing: 'fixed', label: 'class' });
    const ctx = planContext(testHousehold([testActivity(), busy]), 'poor');
    expect(cleanestStart(situationOf(ctx), testActivity())).toBe(900);
    expect(cleanestStart(situationOf({ ...ctx, notBefore: '15:30' }), testActivity())).toBe(960);
  });

  it('gives nothing without a forecast for the usual hours, or when no hour is cleaner by enough', () => {
    const none = situationOf(planContext(testHousehold([testActivity()]), 'poor', null));
    expect(cleanestStart(none, testActivity())).toBeNull();
    const flat = situationOf(planContext(testHousehold([testActivity()]), 'poor', hourCurve(flatDay(200))));
    expect(cleanestStart(flat, testActivity())).toBeNull();
  });

  it('breaks a tie by staying nearest the usual time', () => {
    const tie = flatDay(300).map((value, hour) => (hour === 8 || hour === 16 ? 100 : value));
    const s = situationOf(planContext(testHousehold([testActivity()]), 'poor', hourCurve(tie)));
    expect(cleanestStart(s, testActivity())).toBe(960);
  });
});
