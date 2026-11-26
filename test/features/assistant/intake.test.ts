// Tests for intake: the household parse passes only when unplaced phrases are copied, no name is repeated and no
// measure is guessed, and every number in labels and notes comes from the text or the household returned.
import { describe, expect, it } from 'vitest';
import { guessedMeasure, runIntake, type IntakeReply } from '../../../src/features/assistant/intake.js';
import type { Household } from '../../../src/features/household/types.js';
import { createFakeModel } from '../../support/fake-model.js';
import { testRun } from '../../support/model-run.js';
import { sampleHousehold } from '../../support/samples.js';

const TEXT =
  'Two adults, a child with asthma and a grandmother. One adult drives 14 km to the office at 8:30. The child ' +
  'plays football at 6 pm, it can move. Bedroom 140 sq ft, living room 220 sq ft with a purifier of CADR 250. ' +
  'Our cat sleeps a lot.';

function reply(overrides: Partial<IntakeReply> = {}): IntakeReply {
  return { household: sampleHousehold(), unplaced: ['Our cat sleeps a lot.'], assumed: [], ...overrides };
}

function withTrip(distanceKm: number | null, occupancy: number | null): Household {
  const household = sampleHousehold();
  const [first, ...rest] = household.activities;
  if (!first?.travel) {
    throw new Error('sample has no trip');
  }
  return {
    ...household,
    activities: [{ ...first, travel: { ...first.travel, distanceKm, occupancy } }, ...rest],
  };
}

describe('runIntake', () => {
  it('returns the checked household with a model trace', async () => {
    const model = createFakeModel([
      { reply: reply({ assumed: ['The football lasts 60 minutes from 18:00.'] }) },
    ]);
    const result = await runIntake(testRun(model), TEXT);
    expect(result.kind).toBe('checked');
    expect(result.kind === 'checked' ? result.value.household.members.length : 0).toBe(4);
    expect(result.trace).toMatchObject({
      producedBy: 'model',
      factsSent: [],
      numberCheck: { status: 'passed' },
    });
    expect(model.requests[0]?.data).toBe(TEXT);
    expect(model.requests[0]?.task).toBe('intake');
  });

  it('rejects an unplaced phrase that is not copied exactly from the text', async () => {
    const model = createFakeModel([{ reply: reply({ unplaced: ['Our dog sleeps a lot.'] }) }]);
    const result = await runIntake(testRun(model), TEXT);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(model.requests[1]?.instructions).toMatch(/unplaced phrase was not copied exactly/);
  });

  it('rejects a label or note that repeats a name from the text', async () => {
    const named = 'Meera plays football at 6 pm. Bedroom 140 sq ft, living room 220 sq ft, CADR 250, 14 km.';
    const labelled = reply({ unplaced: [], assumed: ["Meera's practice is fixed."] });
    const model = createFakeModel([{ reply: labelled }]);
    expect(await runIntake(testRun(model), named)).toMatchObject({
      kind: 'fallback',
      reason: 'invalid_reply',
    });
    expect(model.requests[1]?.instructions).toMatch(/repeated a name/);
  });

  it('rejects a guessed distance and asks again', async () => {
    const model = createFakeModel([{ reply: reply({ household: withTrip(9, 1) }) }]);
    const result = await runIntake(testRun(model), TEXT);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(model.requests[1]?.instructions).toMatch(/distance, area, CADR or occupancy/);
  });

  it('rejects a number in a note that is neither in the text nor in the household', async () => {
    const model = createFakeModel([{ reply: reply({ assumed: ['The AQI is 420, so stay in.'] }) }]);
    const result = await runIntake(testRun(model), TEXT);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'number_check_failed' });
    expect(result.trace.numberCheck.unmatched).toEqual(['420']);
  });

  it('accepts a label with no name and a null label', async () => {
    const household = sampleHousehold();
    const activities = household.activities.map((activity) => ({ ...activity, label: null }));
    const model = createFakeModel([{ reply: reply({ household: { ...household, activities } }) }]);
    expect((await runIntake(testRun(model), TEXT)).kind).toBe('checked');
  });
});

describe('guessedMeasure', () => {
  const stated = [14, 140, 220, 250, 28, 500, 2];

  it('accepts measures the person gave, a halved round trip and metres as km', () => {
    expect(guessedMeasure(withTrip(14, 1), stated)).toBe(false);
    expect(guessedMeasure(withTrip(28 / 2, null), stated)).toBe(false);
    expect(guessedMeasure(withTrip(0.5, 1), stated)).toBe(false);
    expect(guessedMeasure(withTrip(null, null), stated)).toBe(false);
  });

  it('accepts one or two riders without a number, and more only when given as written or plus the traveller', () => {
    expect(guessedMeasure(withTrip(14, 2), stated)).toBe(false);
    expect(guessedMeasure(withTrip(14, 3), stated)).toBe(false);
    expect(guessedMeasure(withTrip(14, 4), stated)).toBe(true);
  });

  it('flags a distance, area or CADR the person did not give', () => {
    expect(guessedMeasure(withTrip(9, 1), stated)).toBe(true);
    const household = sampleHousehold();
    const rooms = household.home.rooms.map((room) => ({ ...room, areaSqFt: 150 }));
    expect(guessedMeasure({ ...household, home: { ...household.home, rooms } }, stated)).toBe(true);
    const cadr = household.home.rooms.map((room) => ({ ...room, purifier: { cadrM3PerHour: 300 } }));
    expect(guessedMeasure({ ...household, home: { ...household.home, rooms: cadr } }, stated)).toBe(true);
  });
});
