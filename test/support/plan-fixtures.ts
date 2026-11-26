// Fixtures for planner tests: a synthetic two-day PM2.5 curve and a collector of every text a plan shows.
// The curve values are made up test data with the usual winter shape, not a forecast.
import type { HourCurve } from '../../src/features/air/types.js';
import { SAMPLE_HOUSEHOLDS } from '../../src/features/household/samples.js';
import type { Activity, Household, Member } from '../../src/features/household/types.js';
import type { AqiBand } from '../../src/features/naqi/types.js';
import type { PlanContext } from '../../src/features/planner/context.js';
import type { Plan } from '../../src/features/planner/types.js';
import { hourCurve } from './fake-air.js';

const DAY: readonly number[] = [
  260, 255, 250, 250, 255, 270, 300, 320, 310, 280, 240, 200, 150, 130, 110, 120, 170, 220, 300, 330, 340,
  330, 310, 280,
];

/** Hourly PM2.5 for two days from midnight IST: dirty mornings and late evenings, cleanest mid afternoon. */
export function winterDay(): number[] {
  return [...DAY, ...DAY];
}

/** A flat curve: every hour of two days has the same PM2.5 value. */
export function flatDay(value: number): number[] {
  return Array.from({ length: 48 }, () => value);
}

/** Every piece of text a plan shows a reader: headline, items, toggles, indoor steps and alternatives. */
export function planTexts(plan: Plan): string[] {
  const items = [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening];
  return [
    plan.headline,
    ...items.flatMap((item) => [
      item.title,
      item.why,
      item.tradeOff ?? '',
      ...item.whatIfs.map((w) => w.label),
    ]),
    ...items.flatMap((item) => item.effects.map((effect) => effect.working.formula)),
    ...plan.indoor.flatMap((step) => [step.title, step.detail, step.figure?.label ?? '']),
    ...plan.indoor.flatMap((step) => [step.figure?.working.formula ?? '']),
    ...plan.alternatives.flatMap((alt) => [
      alt.instead,
      alt.doThis,
      alt.reason,
      alt.effect?.working.formula ?? '',
    ]),
  ];
}

/** A plan context for the fixture date with the winter curve unless another curve is given. */
export function planContext(
  household: Household,
  band: AqiBand | null,
  curve: HourCurve | null = hourCurve(winterDay()),
): PlanContext {
  return { household, band, curve, date: '2026-11-24', notBefore: null };
}

/** An activity for one adult, flexible football at 18:00 for an hour, with fields overridden as given. */
export function testActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    memberIds: ['m1'],
    kind: 'outdoor_play',
    label: 'football',
    start: '18:00',
    durationMinutes: 60,
    timing: 'flexible',
    setting: 'outdoor',
    travel: null,
    ...overrides,
  };
}

/** A household of the given members, one adult when none are given, doing the given activities. */
export function testHousehold(
  activities: Activity[],
  members: Member[] = [{ id: 'm1', ageGroup: 'adult', flags: [] }],
): Household {
  return {
    members,
    activities,
    home: { rooms: [], cookingFuel: 'lpg', indoorSources: [] },
  };
}

/** The sample household with this id. A missing id is a broken test and throws. */
export function sample(id: string): Household {
  const found = SAMPLE_HOUSEHOLDS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`no sample ${id}`);
  }
  return found.household;
}
