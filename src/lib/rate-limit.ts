// The rate limiter port and an in-memory fixed-window limiter keyed by client.
import type { Clock } from './clock.js';

/** Outcome of asking for one unit of capacity. */
export type RateDecision =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

/** The rate limiter port. A shared store can implement it later without changing callers. */
export interface RateLimiter {
  take(key: string): Promise<RateDecision>;
}

/** Settings for the in-memory limiter. */
export interface FixedWindowOptions {
  readonly limit: number;
  readonly windowMs: number;
  readonly maxKeys: number;
  readonly clock: Clock;
}

interface Window {
  readonly start: number;
  count: number;
}

function evict(windows: Map<string, Window>, now: number, options: FixedWindowOptions): void {
  for (const [key, window] of windows) {
    if (now - window.start >= options.windowMs) {
      windows.delete(key);
    }
  }
  const oldest = windows.keys().next();
  if (windows.size >= options.maxKeys && !oldest.done) {
    windows.delete(oldest.value);
  }
}

function decide(window: Window, now: number, options: FixedWindowOptions): RateDecision {
  if (window.count >= options.limit) {
    const waitMs = window.start + options.windowMs - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
  }
  window.count += 1;
  return { allowed: true, remaining: options.limit - window.count };
}

/** Counts requests per key in fixed windows. State lives in this process only. */
export function createFixedWindowLimiter(options: FixedWindowOptions): RateLimiter {
  const windows = new Map<string, Window>();
  return {
    take(key) {
      const now = options.clock.now();
      const current = windows.get(key);
      if (current && now - current.start < options.windowMs) {
        return Promise.resolve(decide(current, now, options));
      }
      windows.delete(key);
      if (windows.size >= options.maxKeys) {
        evict(windows, now, options);
      }
      const fresh: Window = { start: now, count: 0 };
      windows.set(key, fresh);
      return Promise.resolve(decide(fresh, now, options));
    },
  };
}
