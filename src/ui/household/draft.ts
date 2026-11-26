// The household form's working copy: numbers stay as typed until saving, when the household schema checks the
// whole thing and each problem is tied to the field that holds it by its path.
import { householdSchema } from '../../features/household/schemas.js';
import type { Activity, Home, Household, Member, Room, Travel } from '../../features/household/types.js';

/** A trip as typed. km and people are the text of their inputs. */
export interface DraftTravel extends Pick<Travel, 'mode' | 'fuel' | 'roundTrip'> {
  readonly km: string;
  readonly people: string;
}

/** An outing as typed. minutes is the text of its input. */
export interface DraftActivity extends Omit<Activity, 'durationMinutes' | 'travel'> {
  readonly minutes: string;
  readonly travel: DraftTravel | null;
}

/** A room as typed. purifier says whether there is one; cadr is the text of its input. */
export interface DraftRoom extends Pick<Room, 'id' | 'kind'> {
  readonly area: string;
  readonly purifier: boolean;
  readonly cadr: string;
}

/** The whole form. */
export interface Draft {
  readonly members: readonly Member[];
  readonly activities: readonly DraftActivity[];
  readonly home: Omit<Home, 'rooms'> & { readonly rooms: readonly DraftRoom[] };
}

/** The outcome of a save: the checked household, or the problems by field key and the first of them. */
export type Checked =
  | { readonly ok: true; readonly household: Household }
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>>; readonly first: string };

const text = (value: number | null): string => (value === null ? '' : String(value));
const number = (value: string): number | null => (value.trim() === '' ? null : Number(value));

/** One adult, no outings, an unknown cooking fuel: a form someone can start from with no model at all. */
export function emptyDraft(): Draft {
  return {
    members: [{ id: 'm1', ageGroup: 'adult', flags: [] }],
    activities: [],
    home: { rooms: [], cookingFuel: 'unknown', indoorSources: [] },
  };
}

/** The form for a household. */
export function toDraft({ members, activities, home }: Household): Draft {
  return {
    members,
    activities: activities.map(({ durationMinutes, travel, ...rest }) => ({
      ...rest,
      minutes: String(durationMinutes),
      travel: travel && {
        mode: travel.mode,
        fuel: travel.fuel,
        roundTrip: travel.roundTrip,
        km: text(travel.distanceKm),
        people: text(travel.occupancy),
      },
    })),
    home: {
      ...home,
      rooms: home.rooms.map(({ areaSqFt, purifier, ...rest }) => ({
        ...rest,
        area: text(areaSqFt),
        purifier: purifier !== null,
        cadr: text(purifier?.cadrM3PerHour ?? null),
      })),
    },
  };
}

function toHousehold({ members, activities, home }: Draft): unknown {
  return {
    members,
    activities: activities.map(({ minutes, travel, ...rest }) => ({
      ...rest,
      durationMinutes: number(minutes),
      travel: travel && {
        mode: travel.mode,
        fuel: travel.fuel,
        distanceKm: number(travel.km),
        occupancy: number(travel.people),
        roundTrip: travel.roundTrip,
      },
    })),
    home: {
      ...home,
      rooms: home.rooms.map(({ area, purifier, cadr, ...rest }) => ({
        ...rest,
        areaSqFt: number(area),
        purifier: purifier ? { cadrM3PerHour: number(cadr) } : null,
      })),
    },
  };
}

const MESSAGES: Readonly<Record<string, string>> = {
  members: 'Add at least one person.',
  memberIds: 'Tick who goes.',
  label: 'Write up to 60 characters, or leave it empty.',
  start: 'Enter a time such as 07:30.',
  durationMinutes: 'Enter the minutes, from 5 to 720.',
  distanceKm: 'Enter the km one way, more than 0 and up to 300.',
  occupancy: 'Enter 1 to 60 people.',
  areaSqFt: 'Enter the area, more than 0 and up to 5000 sq ft.',
  cadrM3PerHour: 'Enter the CADR, more than 0 and up to 5000 m³/h.',
};

/** The key of a field by its path in the household, such as "activities.0.start". Ids and errors use it. */
export function fieldKey(path: readonly PropertyKey[]): string {
  return path.map(String).join('.');
}

/** Checks the form with the household schema. Each field gets the first problem found in it. */
export function checkDraft(draft: Draft): Checked {
  const parsed = householdSchema.safeParse(toHousehold(draft));
  if (parsed.success) {
    return { ok: true, household: parsed.data };
  }
  const errors: Record<string, string> = {};
  for (const { path } of parsed.error.issues) {
    const key = fieldKey(path);
    errors[key] ??= MESSAGES[String(path.at(-1))] ?? 'Check this field.';
  }
  return { ok: false, errors, first: Object.keys(errors).slice(0, 1).join('') };
}
