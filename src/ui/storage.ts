// State kept in the browser between visits: the household, the place, the language and whether this browser lets
// the app use the model. A saved copy is checked on load, so a damaged copy is dropped instead of breaking the page.
import { z } from 'zod';
import { locationSchema, placeSchema } from '../features/air/schemas.js';
import { householdSchema } from '../features/household/schemas.js';
import { languageSchema } from '../lib/schemas/common.js';

/** Key the saved state lives under in local storage. */
export const STORAGE_KEY = 'saved-state';

/** Whether this browser lets the app send to the model: on, off, or not chosen yet. */
export const modelChoiceSchema = z.enum(['on', 'off']).nullable();

/** A model choice: on, off, or null when not chosen yet. */
export type ModelChoiceValue = z.infer<typeof modelChoiceSchema>;

/**
 * Everything kept between visits. location is the point used for the air, from search or the device; place is
 * set only when it came from search. modelChoice may be missing in a copy saved before it existed, which reads as
 * not chosen, so that copy keeps its household. Bump version when the shape changes, and older copies are dropped.
 */
export const storedStateSchema = z.strictObject({
  version: z.literal(1),
  household: householdSchema.nullable(),
  location: locationSchema.nullable(),
  place: placeSchema.nullable(),
  language: languageSchema,
  modelChoice: modelChoiceSchema.default(null),
});

/** A saved state accepted by storedStateSchema. */
export type StoredState = z.infer<typeof storedStateSchema>;

/** The state of a first visit. */
export const EMPTY_STATE: StoredState = {
  version: 1,
  household: null,
  location: null,
  place: null,
  language: 'en',
  modelChoice: null,
};

/** Reads the saved state. A missing, unreadable or outdated copy gives the empty state. */
export function loadState(storage: Storage): StoredState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    const parsed = raw === null ? null : storedStateSchema.safeParse(JSON.parse(raw));
    return parsed?.success ? parsed.data : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

/** Saves the state. It returns false when the browser refuses, for example when storage is full or blocked. */
export function saveState(storage: Storage, state: StoredState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Removes the saved state, for a control that forgets the household. It returns false when the browser refuses. */
export function clearState(storage: Storage): boolean {
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
