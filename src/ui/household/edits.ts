// Pure edits of the form's working copy: replace a row, pick a free id, drop a person, change how a trip is made.
import type { Member, TravelMode } from '../../features/household/types.js';
import type { Draft, DraftActivity, DraftRoom, DraftTravel } from './draft.js';

/** Motor vehicles whose CO2 is shared by the people inside, so their fuel and occupancy matter. */
export const VEHICLES: ReadonlySet<TravelMode> = new Set(['car', 'taxi', 'two_wheeler', 'auto_rickshaw']);

/** Most people, outings and rooms the household schema accepts. */
export const MAX_ROWS = { members: 12, activities: 30, rooms: 10 };

/** A field bound to a control: its value and a change that writes the row back. */
export interface Bound<V> {
  readonly value: V;
  readonly onChange: (value: V) => void;
}

/** Binds a row's fields to controls, so a control takes {...bind('kind')}. */
export function binder<T extends object>(
  row: T,
  set: (next: T) => void,
): <K extends keyof T>(key: K) => Bound<T[K]> {
  return (key) => ({
    value: row[key],
    onChange: (value) => {
      set({ ...row, [key]: value });
    },
  });
}

/** The list with the item at index replaced. */
export function replaceAt<T>(list: readonly T[], index: number, item: T): T[] {
  return list.map((current, at) => (at === index ? item : current));
}

/** The first id of the form m1, m2 and so on that no row uses yet. */
export function freeId(prefix: string, rows: readonly { readonly id: string }[]): string {
  const taken = new Set(rows.map((row) => row.id));
  const candidates = Array.from({ length: rows.length + 1 }, (_, index) => `${prefix}${String(index + 1)}`);
  return candidates
    .filter((id) => !taken.has(id))
    .slice(0, 1)
    .join('');
}

/** The draft without a person, who is also taken out of every outing they were in. */
export function withoutMember(draft: Draft, id: string): Draft {
  return {
    ...draft,
    members: draft.members.filter((member) => member.id !== id),
    activities: draft.activities.map((activity) => ({
      ...activity,
      memberIds: activity.memberIds.filter((memberId) => memberId !== id),
    })),
  };
}

/**
 * A trip made another way. Walking, cycling and public transport carry no fuel or occupancy; a motor vehicle
 * keeps what was typed, with an unknown fuel until one is chosen. none means the outing has no travel.
 */
export function withMode(travel: DraftTravel | null, mode: TravelMode | 'none'): DraftTravel | null {
  if (mode === 'none') {
    return null;
  }
  const vehicle = VEHICLES.has(mode);
  const before = travel ?? { mode, fuel: null, km: '', people: '', roundTrip: true };
  return {
    ...before,
    mode,
    fuel: vehicle ? (before.fuel ?? 'unknown') : null,
    people: vehicle ? before.people : '',
  };
}

/** A new person, outing or room with plain defaults. */
export const NEW_ROW = {
  member: (draft: Draft): Member => ({ id: freeId('m', draft.members), ageGroup: 'adult', flags: [] }),
  activity: (draft: Draft): DraftActivity => ({
    id: freeId('a', draft.activities),
    memberIds: draft.members.slice(0, 1).map((member) => member.id),
    kind: 'other',
    label: null,
    start: '08:00',
    minutes: '30',
    timing: 'fixed',
    setting: 'outdoor',
    travel: null,
  }),
  room: (draft: Draft): DraftRoom => ({
    id: freeId('r', draft.home.rooms),
    kind: 'bedroom',
    area: '',
    purifier: false,
    cadr: '',
  }),
};
