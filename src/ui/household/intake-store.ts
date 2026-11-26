// The latest reading of the household text, held in memory only, so the household view can show the text beside
// what was read. The typed text is never written to storage; a reload forgets it.
import { useSyncExternalStore } from 'react';
import type { IntakeResponse } from '../../features/household/types.js';

/** The text as sent and what came back. used turns true once the read household has been saved from the form. */
export interface IntakeEntry {
  readonly text: string;
  readonly response: IntakeResponse;
  readonly used: boolean;
}

let latest: IntakeEntry | null = null;
const listeners = new Set<() => void>();

function publish(next: IntakeEntry | null): void {
  latest = next;
  for (const listener of listeners) {
    listener();
  }
}

/** Keeps a new reading, or forgets the last one with null. */
export function setIntake(entry: Omit<IntakeEntry, 'used'> | null): void {
  publish(entry === null ? null : { ...entry, used: false });
}

/** Marks the read household as saved, so the form starts from the saved one next time. The text stays. */
export function markIntakeUsed(): void {
  publish(latest === null ? null : { ...latest, used: true });
}

/** The latest reading, outside React. */
export function readIntake(): IntakeEntry | null {
  return latest;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The latest reading, kept current in a component. */
export function useIntakeEntry(): IntakeEntry | null {
  return useSyncExternalStore(subscribe, readIntake);
}
