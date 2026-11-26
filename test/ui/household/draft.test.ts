// Tests for the form's working copy: it round-trips every sample, starts empty without a model, and ties each
// schema error to the field that holds it.
import { describe, expect, it } from 'vitest';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import { checkDraft, emptyDraft, fieldKey, toDraft } from '../../../src/ui/household/draft.js';
import type { Draft, DraftRoom, DraftTravel } from '../../../src/ui/household/draft.js';
import { sampleHousehold } from '../../support/samples.js';

const withTrip = (change: Partial<DraftTravel>): Draft => {
  const draft = toDraft(sampleHousehold());
  const [first, ...rest] = draft.activities;
  const trip: DraftTravel = { mode: 'car', fuel: 'petrol', km: '4', people: '1', roundTrip: true, ...change };
  return first ? { ...draft, activities: [{ ...first, travel: trip }, ...rest] } : draft;
};

describe('draft', () => {
  it('turns every sample into a draft and back into the same household', () => {
    for (const sample of SAMPLE_HOUSEHOLDS) {
      expect(checkDraft(toDraft(sample.household))).toEqual({ ok: true, household: sample.household });
    }
  });

  it('starts empty with one adult and nothing else, which is already a valid household', () => {
    const draft = emptyDraft();
    expect(draft.members).toEqual([{ id: 'm1', ageGroup: 'adult', flags: [] }]);
    expect(checkDraft(draft)).toEqual({
      ok: true,
      household: { members: draft.members, activities: [], home: draft.home },
    });
  });

  it('ties each problem to its field, in form order, with plain words', () => {
    const draft = withTrip({ km: 'far', people: '0' });
    const broken: Draft = {
      ...draft,
      activities: draft.activities.map((activity, index) =>
        index === 0 ? { ...activity, minutes: '', start: '7.30' } : activity,
      ),
    };
    const result = checkDraft(broken);
    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errors).toEqual({
      'activities.0.start': 'Enter a time such as 07:30.',
      'activities.0.durationMinutes': 'Enter the minutes, from 5 to 720.',
      'activities.0.travel.distanceKm': 'Enter the km one way, more than 0 and up to 300.',
      'activities.0.travel.occupancy': 'Enter 1 to 60 people.',
    });
    expect(result.ok ? null : result.first).toBe('activities.0.start');
  });

  it('asks for at least one person when every person is removed', () => {
    const result = checkDraft({ ...emptyDraft(), members: [] });
    expect(result.ok ? null : result.errors).toEqual({ members: 'Add at least one person.' });
  });

  it('keeps an empty number as not given, and a purifier with no CADR as a purifier', () => {
    const draft = emptyDraft();
    const room: DraftRoom = { id: 'r1', kind: 'bedroom', area: '', purifier: true, cadr: '' };
    const result = checkDraft({ ...draft, home: { ...draft.home, rooms: [room] } });
    expect(result.ok ? result.household.home.rooms : null).toEqual([
      { id: 'r1', kind: 'bedroom', areaSqFt: null, purifier: { cadrM3PerHour: null } },
    ]);
  });

  it('keeps one plain message for problems of the whole household', () => {
    const draft = toDraft(sampleHousehold());
    const twins: Draft = {
      ...draft,
      members: draft.members.map((member) => ({ ...member, id: 'm1' })),
      activities: draft.activities.map((activity) => ({ ...activity, memberIds: ['m9'] })),
    };
    expect(checkDraft(twins)).toEqual({ ok: false, errors: { '': 'Check this field.' }, first: '' });
  });

  it('joins a path into the key the form uses for ids and errors', () => {
    expect(fieldKey(['home', 'rooms', 2, 'areaSqFt'])).toBe('home.rooms.2.areaSqFt');
  });
});
