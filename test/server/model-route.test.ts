// Tests for the shared model route parts: the run takes the client's unit only when asked, uses the route's own
// cache and deadline, and a fallback is logged with its reason code only.
import { describe, expect, it } from 'vitest';
import { ROUTE_DEADLINE_MS } from '../../src/config/limits.js';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { createModelRoute, logFallback, runFor } from '../../src/server/model-route.js';
import { createTestDeps } from '../support/test-deps.js';

describe('runFor', () => {
  it('takes a unit of the client limit only when allow is called, and sets the deadline from the start', async () => {
    const test = createTestDeps();
    const modelLimiter = createFixedWindowLimiter({
      limit: 1,
      windowMs: 60_000,
      maxKeys: 10,
      clock: test.clock,
    });
    const route = createModelRoute<string>({ ...test.deps, modelLimiter }, '/api/plan');
    const run = runFor(route, { clientKey: 'client-a' }, 1000);
    expect(run.deadline).toBe(1000 + ROUTE_DEADLINE_MS);
    expect(run.cache).toBe(route.cache);
    expect(await run.allow()).toMatchObject({ allowed: true });
    expect(await run.allow()).toMatchObject({ allowed: false });
    expect(await runFor(route, { clientKey: 'client-b' }, 0).allow()).toMatchObject({ allowed: true });
  });
});

describe('logFallback', () => {
  it('logs the route and the reason code, and nothing when the model path was used', () => {
    const test = createTestDeps();
    const route = createModelRoute<string>(test.deps, '/api/ask');
    logFallback(route, null);
    expect(test.logLines).toHaveLength(0);
    logFallback(route, 'daily_cap');
    expect(test.logText()).toContain('model_fallback');
    expect(test.logText()).toContain('daily_cap');
    expect(test.logText()).toContain('/api/ask');
  });
});
