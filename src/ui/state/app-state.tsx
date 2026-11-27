// The state every view shares: what this browser keeps between visits, and the latest reading and plan in memory.
// A new place drops the reading and plan made for the old one; a new household or language drops the plan.
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { AirResponse } from '../../features/air/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import { clearState, EMPTY_STATE, loadState, saveState } from '../storage.js';
import type { StoredState } from '../storage.js';

/** The kept fields a view may change: household, location, place, language and the model choice. */
export type SavedFields = Omit<StoredState, 'version'>;

/** Everything shared. kept is false when the browser refused to store the household. */
export interface AppState extends SavedFields {
  readonly reading: AirResponse | null;
  readonly plan: PlanResponse | null;
  readonly kept: boolean;
}

/** Ways to change the shared state. Pass related fields in one save call, such as place with its location. */
export interface AppActions {
  readonly save: (fields: Partial<SavedFields>) => void;
  readonly setReading: (reading: AirResponse | null) => void;
  readonly setPlan: (plan: PlanResponse | null) => void;
  readonly forget: () => void;
}

const differs = (fields: Partial<SavedFields>, state: SavedFields, key: keyof SavedFields): boolean =>
  key in fields && JSON.stringify(fields[key]) !== JSON.stringify(state[key]);

const REPLAN_KEYS: readonly (keyof SavedFields)[] = ['household', 'language', 'modelChoice'];

/**
 * Applies a save: a changed location clears the reading and plan; a changed household, language or model choice
 * clears the plan, so the next one is made for them.
 */
export function applySave(state: AppState, fields: Partial<SavedFields>): AppState {
  const moved = differs(fields, state, 'location');
  const replan = moved || REPLAN_KEYS.some((key) => differs(fields, state, key));
  return { ...state, ...fields, reading: moved ? null : state.reading, plan: replan ? null : state.plan };
}

const savedPart = ({ household, location, place, language, modelChoice }: SavedFields): StoredState => ({
  version: 1,
  household,
  location,
  place,
  language,
  modelChoice,
});

const EMPTY_FIELDS: SavedFields = {
  household: EMPTY_STATE.household,
  location: EMPTY_STATE.location,
  place: EMPTY_STATE.place,
  language: EMPTY_STATE.language,
  modelChoice: EMPTY_STATE.modelChoice,
};

/** Writes the kept fields, or removes them when nothing is left to keep. False when the browser refused. */
function persist(storage: Storage | null, state: AppState): boolean {
  if (storage === null) {
    return false;
  }
  const part = savedPart(state);
  return JSON.stringify(part) === JSON.stringify(EMPTY_STATE)
    ? clearState(storage)
    : saveState(storage, part);
}

const StateContext = createContext<AppState | null>(null);
const ActionsContext = createContext<AppActions | null>(null);

/** Props of the provider. storage is the browser's local storage, or null where the browser blocks it. */
export interface AppStateProviderProps {
  readonly storage: Storage | null;
  readonly children?: ReactNode;
}

/** Loads the kept state once, saves it on every change and forgets it on request. */
export function AppStateProvider({ storage, children }: AppStateProviderProps): ReactElement {
  const [state, setState] = useState<AppState>(() => ({
    ...(storage === null ? EMPTY_STATE : loadState(storage)),
    reading: null,
    plan: null,
    kept: storage !== null,
  }));
  const latest = useRef(state);
  const actions = useMemo<AppActions>(() => {
    const commit = (next: AppState): void => {
      latest.current = next;
      setState(next);
    };
    const keep = (next: AppState): AppState => ({ ...next, kept: persist(storage, next) });
    return {
      save: (fields) => {
        commit(keep(applySave(latest.current, fields)));
      },
      setReading: (reading) => {
        commit({ ...latest.current, reading });
      },
      setPlan: (plan) => {
        commit({ ...latest.current, plan });
      },
      forget: () => {
        commit(keep({ ...applySave(latest.current, EMPTY_FIELDS), reading: null }));
      },
    };
  }, [storage]);
  return (
    <ActionsContext value={actions}>
      <StateContext value={state}>{children}</StateContext>
    </ActionsContext>
  );
}

/** The shared state. Use it inside the app frame. */
export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (state === null) {
    throw new Error('useAppState is used outside AppStateProvider');
  }
  return state;
}

/** The actions that change the shared state. They keep their identity, so effects may depend on them. */
export function useAppActions(): AppActions {
  const actions = useContext(ActionsContext);
  if (actions === null) {
    throw new Error('useAppActions is used outside AppStateProvider');
  }
  return actions;
}
