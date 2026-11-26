// Tests for the calculators a question may use: ids in, figures the plan shows out, nothing for metro CO2 or a
// free number, and the household's own numbers as facts.
import { describe, expect, it } from 'vitest';
import { askTools, householdFacts } from '../../../src/features/assistant/tools.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { planContext, sample } from '../../support/plan-fixtures.js';

const ctx = planContext(sample('family-car-asthma'), 'severe');
const set = buildCandidates(ctx);
const [options, travel, purifier] = askTools(ctx, set);

describe('activity_options', () => {
  it('lists what the plan suggests for an activity, with its effects as the plan words them and their facts', () => {
    const result = options?.call({ activityId: 'a1' });
    expect(result?.ok && result.value).toMatchObject({
      found: true,
      activity: 'office commute',
      start: '08:30',
    });
    const text = JSON.stringify(result?.ok ? result.value : null);
    expect(text).toMatch(/kg less CO2 a trip/);
    expect(text).toMatch(/co2-car-petrol/);
  });

  it('finds nothing for an unknown activity and refuses an argument that is not an id', () => {
    expect(options?.call({ activityId: 'a99' })).toEqual({ ok: true, value: { found: false } });
    expect(options?.call({ activityId: 'a1; drop' })).toEqual({ ok: false, error: 'invalid_arguments' });
    expect(options?.call({ activityId: 'a1', kg: 50 })).toEqual({ ok: false, error: 'invalid_arguments' });
  });
});

describe('switch_travel', () => {
  it('gives the bus CO2 and breathing change for the car commute, as the what-if toggle does', () => {
    const result = travel?.call({ activityId: 'a1', mode: 'bus' });
    const value = result?.ok ? JSON.stringify(result.value) : '';
    expect(value).toMatch(/"co2Figure":true/);
    expect(value).toMatch(/kg less CO2 a trip for each person/);
    expect(value).toMatch(/co2-bus/);
  });

  it('never gives a CO2 figure for the metro, and takes only the closed list of modes', () => {
    const result = travel?.call({ activityId: 'a1', mode: 'metro' });
    const value = result?.ok ? JSON.stringify(result.value) : '';
    expect(value).toMatch(/"co2Figure":false/);
    expect(value).not.toMatch(/kg/);
    expect(travel?.call({ activityId: 'a1', mode: 'car' })).toEqual({
      ok: false,
      error: 'invalid_arguments',
    });
    expect(travel?.call({ activityId: 'a2', mode: 'bus' })).toEqual({ ok: true, value: { found: false } });
  });
});

describe('room_purifier', () => {
  it('sizes a room from its area and says whether its purifier meets the need', () => {
    expect(purifier?.call({ roomId: 'r2' })).toEqual({
      ok: true,
      value: {
        found: true,
        areaSqFt: 220,
        neededCadrM3PerHour: 243,
        purifierCadrM3PerHour: 250,
        meetsNeed: true,
        factIds: ['purifier-cadr-per-area', 'unit-cfm-m3h'],
      },
    });
    expect(purifier?.call({ roomId: 'r1' })).toMatchObject({
      value: { purifierCadrM3PerHour: null, meetsNeed: null },
    });
    expect(purifier?.call({ roomId: 'r9' })).toEqual({ ok: true, value: { found: false } });
  });
});

describe('householdFacts', () => {
  it('gives every start, length, distance, rider count, room area and purifier CADR as entered', () => {
    const facts = householdFacts(sample('family-car-asthma'));
    const values = (id: string) => facts.filter((fact) => fact.id === id).map((fact) => fact.value);
    expect(values('a1')).toEqual([8, 8, 30, 45, 14, 1]);
    expect(values('r2')).toEqual([220, 250]);
    expect(values('r1')).toEqual([140]);
  });
});
