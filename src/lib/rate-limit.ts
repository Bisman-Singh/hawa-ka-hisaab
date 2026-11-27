// The rate limiter port, an in-memory fixed-window limiter keyed by client, and the key for a client address.
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

const waitSeconds = (window: Window, now: number, options: FixedWindowOptions): number =>
  Math.max(1, Math.ceil((window.start + options.windowMs - now) / 1000));

// Frees places for a new key, oldest first: an ended window, or a live one that is not blocked. A blocked client is
// never dropped, since dropping it would let it start again inside its window. False when all are blocked.
function makeRoom(windows: Map<string, Window>, now: number, options: FixedWindowOptions): boolean {
  for (const [key, window] of windows) {
    if (windows.size < options.maxKeys) {
      return true;
    }
    if (now - window.start >= options.windowMs || window.count < options.limit) {
      windows.delete(key);
    }
  }
  return windows.size < options.maxKeys;
}

function decide(window: Window, now: number, options: FixedWindowOptions): RateDecision {
  if (window.count >= options.limit) {
    return { allowed: false, retryAfterSeconds: waitSeconds(window, now, options) };
  }
  window.count += 1;
  return { allowed: true, remaining: options.limit - window.count };
}

/**
 * Counts requests per key in fixed windows. State lives in this process only. When every tracked key is blocked
 * a new key is refused until the oldest window ends, so a flood of new keys cannot unblock anyone.
 */
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
      const oldest = windows.values().next();
      if (!oldest.done && windows.size >= options.maxKeys && !makeRoom(windows, now, options)) {
        return Promise.resolve({
          allowed: false,
          retryAfterSeconds: waitSeconds(oldest.value, now, options),
        });
      }
      const fresh: Window = { start: now, count: 0 };
      windows.set(key, fresh);
      return Promise.resolve(decide(fresh, now, options));
    },
  };
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const HEX_GROUP = /^[0-9a-f]{1,4}$/;

// The eight groups of an IPv6 address, with :: expanded, or null when it is not one.
function ipv6Groups(address: string): string[] | null {
  const halves = address.split('::');
  const [head = '', tail = ''] = halves;
  const groups = (part: string) => (part === '' ? [] : part.split(':'));
  const missing = 8 - groups(head).length - groups(tail).length;
  const all = [...groups(head), ...Array<string>(Math.max(missing, 0)).fill('0'), ...groups(tail)];
  const valid = halves.length <= 2 && (halves.length === 2 ? missing > 0 : missing === 0);
  return valid && all.every((group) => HEX_GROUP.test(group)) ? all : null;
}

/**
 * The rate limit key for a client address. IPv4 is kept as it is, also when written as IPv4 mapped IPv6. IPv6 is
 * cut to its /64 network, which one home or phone usually holds whole, so changing the last half of the address
 * does not give a new bucket. Anything that is not an address gives null.
 */
export function addressKey(address: string): string | null {
  const text = address.trim().toLowerCase();
  const mapped = text.startsWith('::ffff:') ? text.slice(7) : text;
  if (IPV4.test(mapped)) {
    return mapped;
  }
  const groups = ipv6Groups(text.replace(/%.*/, ''));
  return groups
    ? `${groups
        .slice(0, 4)
        .map((group) => parseInt(group, 16).toString(16))
        .join(':')}::/64`
    : null;
}
