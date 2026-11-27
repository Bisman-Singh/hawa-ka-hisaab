// Real dependencies for the deployed function and the local dev server, built from the environment.
import { type EnvSource, readServerEnv } from '../config/env.js';
import { RATE_MAX_CLIENTS, RATE_WINDOW_MS } from '../config/limits.js';
import { systemClock } from '../lib/clock.js';
import { consoleSink, createLogger } from '../lib/logger.js';
import { createFixedWindowLimiter } from '../lib/rate-limit.js';
import { withReadLog } from './air/read-log.js';
import { createAirSources } from './air/sources.js';
import type { ServerDeps } from './deps.js';
import { createModelFromEnv } from './model-config.js';

/** Builds the runtime dependencies. A bad variable stops startup with its name only, never its value. */
export function createRuntimeDeps(source: EnvSource): ServerDeps {
  const env = readServerEnv(source);
  if (!env.ok) {
    throw new Error(`Invalid environment variables: ${env.error.join(', ')}`);
  }
  const clock = systemClock;
  const limiter = (limit: number) =>
    createFixedWindowLimiter({ limit, windowMs: RATE_WINDOW_MS, maxKeys: RATE_MAX_CLIENTS, clock });
  const logger = createLogger(consoleSink, clock);
  const air = createAirSources(globalThis.fetch, clock, {
    directFeed: env.value.cpcbDirectFeed,
    dataGovKey: env.value.dataGovInApiKey,
  });
  return {
    clock,
    logger,
    requestLimiter: limiter(env.value.apiRateLimitPerMinute),
    modelLimiter: limiter(env.value.modelRateLimitPerMinute),
    air: { ...air, stations: withReadLog(air.stations, logger) },
    model: createModelFromEnv(env.value, clock),
  };
}
