// Tests for the pure edits of the form's working copy, and that the row limits match the household schema.
import { describe, expect, it, vi } from 'vitest';
import { householdSchema } from '../../../src/features/household/schemas.js';
import type { DraftTravel } from '../../../src/ui/household/draft.js';
import { emptyDraft, toDraft } from '../../../src/ui/household/draft.js';
import {
  binder,
  freeId,
  MAX_ROWS,
  NEW_ROW,
  replaceAt,
  withMode,
  withoutMember,
} from '../../../src/ui/household/edits.js';
import { sampleHousehold } from '../../support/samples.js';

const trip = (change: Partial<DraftTravel> = {}): DraftTravel => ({
  mode: 'car',
  fuel: 'diesel',
  km: '9',
  people: '2',
  roundTrip: false,
  ...change,
});

describe('edits', () => {
  it('replaces one row and picks the first free id', () => {
    expect(replaceAt(['a', 'b', 'c'], 1, 'x')).toEqual(['a', 'x', 'c']);
    expect(freeId('m', [{ id: 'm1' }, { id: 'm3' }])).toBe('m2');
    expect(freeId('m', [{ id: 'm1' }, { id: 'm2' }])).toBe('m3');
    expect(freeId('r', [{ id: 'kitchen' }])).toBe('r1');
  });

  it('takes a removed person out of every outing too', () => {
    const draft = toDraft(sampleHousehold());
    const without = withoutMember(draft, 'm3');
    expect(without.members.map((member) => member.id)).not.toContain('m3');
    expect(without.activities.flatMap((activity) => activity.memberIds)).not.toContain('m3');
  });

  it('changes how a trip is made without leaving fuel or occupancy where they do not belong', () => {
    expect(withMode(trip(), 'none')).toBeNull();
    expect(withMode(trip(), 'cycle')).toEqual(trip({ mode: 'cycle', fuel: null, people: '' }));
    expect(withMode(trip(), 'metro')).toEqual(trip({ mode: 'metro', fuel: null, people: '' }));
    expect(withMode(trip(), 'taxi')).toEqual(trip({ mode: 'taxi' }));
    expect(withMode(trip({ mode: 'walk', fuel: null, people: '' }), 'two_wheeler')).toEqual(
      trip({ mode: 'two_wheeler', fuel: 'unknown', people: '' }),
    );
    expect(withMode(null, 'car')).toEqual({
      mode: 'car',
      fuel: 'unknown',
      km: '',
      people: '',
      roundTrip: true,
    });
  });

  it('binds a field to a control that writes the row back', () => {
    const set = vi.fn();
    const bind = binder({ kind: 'bedroom', area: '' }, set);
    expect(bind('area').value).toBe('');
    bind('area').onChange('140');
    expect(set).toHaveBeenCalledWith({ kind: 'bedroom', area: '140' });
  });

  it('makes new rows with free ids and plain defaults', () => {
    const draft = toDraft(sampleHousehold());
    expect(NEW_ROW.member(draft).id).toBe(`m${String(draft.members.length + 1)}`);
    expect(NEW_ROW.activity(draft)).toMatchObject({ memberIds: ['m1'], timing: 'fixed', travel: null });
    expect(NEW_ROW.activity({ ...emptyDraft(), members: [] }).memberIds).toEqual([]);
    expect(NEW_ROW.room(emptyDraft())).toEqual({
      id: 'r1',
      kind: 'bedroom',
      area: '',
      purifier: false,
      cadr: '',
    });
  });

  it('stops adding rows exactly where the household schema stops accepting them', () => {
    const home = { rooms: [], cookingFuel: 'lpg', indoorSources: [] };
    const member = (n: number) => ({ id: `m${String(n)}`, ageGroup: 'adult', flags: [] });
    const room = (n: number) => ({ id: `r${String(n)}`, kind: 'other', areaSqFt: null, purifier: null });
    const activity = (n: number) => ({
      id: `a${String(n)}`,
      memberIds: ['m1'],
      kind: 'other',
      label: null,
      start: '08:00',
      durationMinutes: 30,
      timing: 'fixed',
      setting: 'indoor',
      travel: null,
    });
    const of = <T>(count: number, make: (n: number) => T): T[] =>
      Array.from({ length: count }, (_, n) => make(n + 1));
    const fits = (members: number, activities: number, rooms: number) =>
      householdSchema.safeParse({
        members: of(members, member),
        activities: of(activities, activity),
        home: { ...home, rooms: of(rooms, room) },
      }).success;
    expect(fits(MAX_ROWS.members, MAX_ROWS.activities, MAX_ROWS.rooms)).toBe(true);
    expect(fits(MAX_ROWS.members + 1, 0, 0)).toBe(false);
    expect(fits(1, MAX_ROWS.activities + 1, 0)).toBe(false);
    expect(fits(1, 0, MAX_ROWS.rooms + 1)).toBe(false);
  });
});
