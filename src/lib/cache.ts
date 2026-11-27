// In-memory cache with a time to live, shared in-flight loads and a last good value on failure.
import type { Clock } from './clock.js';
import type { Result } from './result.js';

/** What a cache read returned: a fresh value, the last good value after a failed load, or nothing. */
export type CacheRead<V, E> =
  | { readonly kind: 'fresh'; readonly value: V; readonly storedAt: number }
  | { readonly kind: 'last_good'; readonly value: V; readonly storedAt: number; readonly error: E }
  | { readonly kind: 'miss'; readonly error: E };

/** A time in milliseconds, fixed or worked out from the value or failure it applies to. */
export type Duration<T> = number | ((subject: T) => number);

/** Settings for one cache instance. A failure held for 0 ms lets the next read load at once. */
export interface TtlCacheOptions<V, E> {
  readonly ttlMs: Duration<V>;
  readonly retryAfterFailureMs: Duration<E>;
  readonly maxEntries: number;
  readonly clock: Clock;
}

/**
 * Loads a value for a key, given the last value stored for it, even an expired one. It reports failure as a Result
 * and should not reject.
 */
export type CacheLoader<V, E> = (previous: V | undefined) => Promise<Result<V, E>>;

/** A keyed cache. Concurrent reads of one key share a single load. */
export interface TtlCache<V, E> {
  read(key: string, load: CacheLoader<V, E>): Promise<CacheRead<V, E>>;
  size(): number;
}

interface Entry<V> {
  readonly value: V;
  readonly storedAt: number;
}

interface Failure<E> {
  readonly error: E;
  readonly until: number;
}

const durationOf = <T>(duration: Duration<T>, subject: T): number =>
  typeof duration === 'number' ? duration : duration(subject);

function dropOldest(map: Map<string, unknown>, maxSize: number): void {
  const oldest = map.keys().next();
  if (map.size > maxSize && !oldest.done) {
    map.delete(oldest.value);
  }
}

class MemoryTtlCache<V, E> implements TtlCache<V, E> {
  readonly #entries = new Map<string, Entry<V>>();
  readonly #failures = new Map<string, Failure<E>>();
  readonly #inFlight = new Map<string, Promise<CacheRead<V, E>>>();
  readonly #options: TtlCacheOptions<V, E>;

  constructor(options: TtlCacheOptions<V, E>) {
    this.#options = options;
  }

  read(key: string, load: CacheLoader<V, E>): Promise<CacheRead<V, E>> {
    const hit = this.#cached(key);
    if (hit) {
      return Promise.resolve(hit);
    }
    const pending = this.#inFlight.get(key);
    if (pending) {
      return pending;
    }
    const started = this.#settle(key, load).finally(() => this.#inFlight.delete(key));
    this.#inFlight.set(key, started);
    return started;
  }

  size(): number {
    return this.#entries.size;
  }

  #cached(key: string): CacheRead<V, E> | null {
    const now = this.#options.clock.now();
    const entry = this.#entries.get(key);
    if (entry && now - entry.storedAt < durationOf(this.#options.ttlMs, entry.value)) {
      return { kind: 'fresh', ...entry };
    }
    const failure = this.#failures.get(key);
    if (failure && now < failure.until) {
      return this.#fallback(key, failure.error);
    }
    return null;
  }

  async #settle(key: string, load: CacheLoader<V, E>): Promise<CacheRead<V, E>> {
    const result = await load(this.#entries.get(key)?.value);
    if (result.ok) {
      return this.#store(key, result.value);
    }
    const until = this.#options.clock.now() + durationOf(this.#options.retryAfterFailureMs, result.error);
    this.#failures.delete(key);
    this.#failures.set(key, { error: result.error, until });
    dropOldest(this.#failures, this.#options.maxEntries);
    return this.#fallback(key, result.error);
  }

  #store(key: string, value: V): CacheRead<V, E> {
    const entry = { value, storedAt: this.#options.clock.now() };
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    this.#failures.delete(key);
    dropOldest(this.#entries, this.#options.maxEntries);
    return { kind: 'fresh', ...entry };
  }

  #fallback(key: string, error: E): CacheRead<V, E> {
    const last = this.#entries.get(key);
    return last ? { kind: 'last_good', ...last, error } : { kind: 'miss', error };
  }
}

/**
 * Creates a cache. A value is fresh for ttlMs; after a failed load it waits retryAfterFailureMs before calling the
 * loader again. Values and failures are each held for at most maxEntries keys, the oldest dropped first.
 */
export function createTtlCache<V, E>(options: TtlCacheOptions<V, E>): TtlCache<V, E> {
  return new MemoryTtlCache<V, E>(options);
}
