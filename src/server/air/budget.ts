// Upstream call budgets. Each request runs with its client key in scope, so a provider about to call an upstream
// can charge that client as well as the whole instance, and one client cannot use up a free tier for everyone.
import { AsyncLocalStorage } from 'node:async_hooks';
import { RATE_MAX_CLIENTS, type UpstreamLimits } from '../../config/limits.js';
import type { Clock } from '../../lib/clock.js';
import type { Fetcher } from '../../lib/http.js';
import { createFixedWindowLimiter } from '../../lib/rate-limit.js';

/** Says whether one more upstream call may be made now. Each yes is counted against the budget. */
export interface UpstreamBudget {
  allow(): Promise<boolean>;
}

/** What every upstream provider is built with. budget defaults to none. */
export interface UpstreamOptions {
  readonly fetcher: Fetcher;
  readonly clock: Clock;
  readonly budget?: UpstreamBudget;
}

/** A budget that always allows, for providers built without one. */
export const UNLIMITED: UpstreamBudget = { allow: () => Promise.resolve(true) };

const asking = new AsyncLocalStorage<string>();

/** Runs work with the client key in scope for every upstream call it causes. */
export function asClient<T>(clientKey: string, work: () => Promise<T>): Promise<T> {
  return asking.run(clientKey, work);
}

const MINUTE = 60_000;

/**
 * Builds a budget from its limits, kept in this instance's memory. A client over its own minute is refused before
 * it is counted against the instance. Calls made outside any request are charged to one shared key.
 */
export function createUpstreamBudget(limits: UpstreamLimits, clock: Clock): UpstreamBudget {
  const limiter = (limit: number, windowMs: number, maxKeys: number) =>
    createFixedWindowLimiter({ limit, windowMs, maxKeys, clock });
  const perClient = limiter(limits.perClientPerMinute, MINUTE, RATE_MAX_CLIENTS);
  const perInstance = [limiter(limits.perMinute, MINUTE, 1), limiter(limits.perDay, 24 * 60 * MINUTE, 1)];
  return {
    allow: async () => {
      const client = await perClient.take(asking.getStore() ?? 'no-request');
      if (!client.allowed) {
        return false;
      }
      const instance = await Promise.all(perInstance.map((window) => window.take('instance')));
      return instance.every((decision) => decision.allowed);
    },
  };
}
