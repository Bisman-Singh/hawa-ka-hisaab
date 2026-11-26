// A short memory of checked model results, so the same request within a few minutes is not sent to the model again.
// Entries expire for real: nothing is kept past its time to live, and the oldest go first when it is full.
import type { Clock } from '../../lib/clock.js';

/** How long a checked result is reused, in milliseconds. */
export const MODEL_CACHE_TTL_MS = 5 * 60_000;

/** Most results held at once. */
export const MODEL_CACHE_ENTRIES = 200;

/** Settings for one cache. */
export interface ReplyCacheOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly clock: Clock;
}

/** A keyed store of results. get returns null for a key never set or past its time to live. */
export interface ReplyCache<V> {
  get(key: string): V | null;
  set(key: string, value: V): void;
}

/** Creates an in-memory cache. Only checked results should be stored; fallbacks are always tried again. */
export function createReplyCache<V>(options: ReplyCacheOptions): ReplyCache<V> {
  const entries = new Map<string, { readonly value: V; readonly at: number }>();
  const sweep = (): number => {
    const now = options.clock.now();
    for (const [key, entry] of entries) {
      if (now - entry.at < options.ttlMs && entries.size <= options.maxEntries) {
        break;
      }
      entries.delete(key);
    }
    return now;
  };
  return {
    get(key) {
      sweep();
      return entries.get(key)?.value ?? null;
    },
    set(key, value) {
      const at = sweep();
      entries.delete(key);
      entries.set(key, { value, at });
      sweep();
    },
  };
}
