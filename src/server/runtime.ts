// Real dependencies for the deployed function and the local dev server, built from the environment.
import { type EnvSource, readServerEnv } from '../config/env.js';
import { RATE_MAX_CLIENTS, RATE_WINDOW_MS } from '../config/limits.js';
import { systemClock } from '../lib/clock.js';
import { consoleSink, createLogger } from '../lib/logger.js';
import { createFixedWindowLimiter } from '../lib/rate-limit.js';
import { createAirSources } from './air/sources.js';
import type { ServerDeps } from './deps.js';

/** Builds the runtime dependencies. A bad variable stops startup with its name only, never its value. */
export function createRuntimeDeps(source: EnvSource): ServerDeps {
  const env = readServerEnv(source);
  if (!env.ok) {
    throw new Error(`Invalid environment variables: ${env.error.join(', ')}`);
  }
  const clock = systemClock;
  const limiter = (limit: number) =>
    createFixedWindowLimiter({ limit, windowMs: RATE_WINDOW_MS, maxKeys: RATE_MAX_CLIENTS, clock });
  return {
    clock,
    logger: createLogger(consoleSink, clock),
    requestLimiter: limiter(env.value.apiRateLimitPerMinute),
    modelLimiter: limiter(env.value.modelRateLimitPerMinute),
    air: createAirSources(globalThis.fetch, clock, env.value.dataGovInApiKey),
  };
}
