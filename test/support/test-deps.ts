// Server dependencies for tests: a fake clock, a capturing logger and generous rate limits.
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import type { ServerDeps } from '../../src/server/deps.js';
import { createCaptureLogger, type CapturedLine } from './capture-logger.js';
import { createFakeAirSources } from './fake-air-sources.js';
import { createFakeClock, type FakeClock } from './fake-clock.js';

/** Test dependencies with handles to the fakes behind them. */
export interface TestDeps {
  readonly deps: ServerDeps;
  readonly clock: FakeClock;
  readonly logLines: readonly CapturedLine[];
  readonly logText: () => string;
}

/** Builds test dependencies. Pass overrides to replace any dependency, such as a strict limiter or a port fake. */
export function createTestDeps(overrides: Partial<ServerDeps> = {}): TestDeps {
  const clock = createFakeClock();
  const capture = createCaptureLogger(clock);
  const limiter = createFixedWindowLimiter({ limit: 1000, windowMs: 60_000, maxKeys: 100, clock });
  const deps: ServerDeps = {
    clock,
    logger: capture.logger,
    requestLimiter: limiter,
    modelLimiter: limiter,
    air: createFakeAirSources(),
    ...overrides,
  };
  return { deps, clock, logLines: capture.lines, logText: capture.text };
}
