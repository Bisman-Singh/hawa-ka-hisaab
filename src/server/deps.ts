// Everything the API needs from the outside world. Tests pass fakes; the runtime passes real implementations.
import type { Hono } from 'hono';
import type { AirSources } from '../features/air/types.js';
import type { Clock } from '../lib/clock.js';
import type { Logger } from '../lib/logger.js';
import type { RateLimiter } from '../lib/rate-limit.js';

/**
 * Dependencies of the API. Each route stream adds the port it needs here, one line each. requestLimiter is applied
 * to every route per client, and a client over it gets 429. modelLimiter is checked per client before each model
 * call; over it the route still answers, on the rules path, with fallbackReason rate_limited.
 */
export interface ServerDeps {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly requestLimiter: RateLimiter;
  readonly modelLimiter: RateLimiter;
  readonly air: AirSources;
}

/** What a route module receives: the app to register on and the dependencies to close over. */
export interface MountTarget {
  readonly app: Hono;
  readonly deps: ServerDeps;
}

/** A route module registers one or more routes. The registry lists them. */
export type RouteModule = (target: MountTarget) => void;
