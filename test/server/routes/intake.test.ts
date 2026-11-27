// Tests for POST /api/intake through the whole app: parsed or unavailable with the reason, never an error page,
// with the per-client model limit, the daily cap reason, the short cache, and no user text in the logs.
import { describe, expect, it } from 'vitest';
import { intakeResponseSchema } from '../../../src/features/household/contract.js';
import { createFixedWindowLimiter } from '../../../src/lib/rate-limit.js';
import { createApp } from '../../../src/server/app.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeModel, type ModelStep } from '../../support/fake-model.js';
import { cappedGemini } from '../../support/route-fixtures.js';
import { sampleHousehold } from '../../support/samples.js';
import { createTestDeps } from '../../support/test-deps.js';

const TEXT =
  'Two adults and a child. One adult drives 14 km to work. Bedroom 140 sq ft, living room 220 sq ft, CADR 250.';
const parsedReply = { household: sampleHousehold(), unplaced: [], assumed: ['The commute starts at 08:30.'] };

function setup(steps: readonly ModelStep[], modelLimit = 100) {
  const model = createFakeModel(steps, 'gemini-test');
  const clock = createFakeClock();
  const modelLimiter = createFixedWindowLimiter({ limit: modelLimit, windowMs: 60_000, maxKeys: 10, clock });
  return { model, clock, app: createApp(createTestDeps({ model, modelLimiter, clock }).deps) };
}

const post = (app: ReturnType<typeof createApp>, text: string) =>
  app.request('/api/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });

async function body(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  return intakeResponseSchema.parse(await response.json());
}

describe('POST /api/intake', () => {
  it('answers unavailable with the reason when no key is set, and logs no user text', async () => {
    const test = createTestDeps();
    const result = await body(await post(createApp(test.deps), TEXT));
    expect(result).toMatchObject({
      outcome: 'unavailable',
      reason: 'disabled',
      trace: { producedBy: 'rules', modelId: null },
    });
    expect(test.logText()).toContain('model_fallback');
    expect(test.logText()).not.toContain('drives');
  });

  it('returns the parsed household with its trace', async () => {
    const { app } = setup([{ reply: parsedReply }]);
    const result = await body(await post(app, TEXT));
    expect(result).toMatchObject({
      outcome: 'parsed',
      unplaced: [],
      trace: { producedBy: 'model', modelId: 'gemini-test' },
    });
  });

  it('answers a repeat of the same text from the cache without the model or the model limit', async () => {
    const { app, model } = setup([{ reply: parsedReply }], 1);
    const first = await body(await post(app, TEXT));
    const second = await body(await post(app, `  ${TEXT}  `));
    expect(first.trace.cached).toBe(false);
    expect(second).toEqual({ ...first, trace: { ...first.trace, cached: true } });
    expect(model.requests).toHaveLength(1);
  });

  it('asks the model again once the cached answer is five minutes old', async () => {
    const { app, model, clock } = setup([{ reply: parsedReply }]);
    await post(app, TEXT);
    clock.advance(300_000);
    await post(app, TEXT);
    expect(model.requests).toHaveLength(2);
  });

  it('never caches a fallback', async () => {
    const { app, model } = setup([{ failure: 'quota' }, { reply: parsedReply }]);
    expect(await body(await post(app, TEXT))).toMatchObject({ outcome: 'unavailable', reason: 'quota' });
    expect(await body(await post(app, TEXT))).toMatchObject({ outcome: 'parsed' });
    expect(model.requests).toHaveLength(2);
  });

  it('answers unavailable rate_limited over the per-client model limit, without calling the model', async () => {
    const { app, model } = setup([{ reply: parsedReply }], 0);
    expect(await body(await post(app, TEXT))).toMatchObject({
      outcome: 'unavailable',
      reason: 'rate_limited',
    });
    expect(model.requests).toHaveLength(0);
  });

  it('passes the daily cap reason through', async () => {
    const { app } = setup([{ failure: 'daily_cap' }]);
    expect(await body(await post(app, TEXT))).toMatchObject({ outcome: 'unavailable', reason: 'daily_cap' });
  });

  it('reports a failed number check with its own reason, the same as the trace', async () => {
    const { app } = setup([{ reply: { ...parsedReply, assumed: ['The AQI is 999.'] } }]);
    const result = await body(await post(app, TEXT));
    expect(result).toMatchObject({
      outcome: 'unavailable',
      reason: 'number_check_failed',
      trace: { fallbackReason: 'number_check_failed', numberCheck: { status: 'failed', unmatched: ['999'] } },
    });
  });

  it('never sends markup from a compromised model as anything but text inside the trace', async () => {
    const { app } = setup([{ reply: { ...parsedReply, assumed: ['<img src=x onerror=alert(1)>'] } }]);
    const response = await post(app, TEXT);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    const result = await body(response);
    expect(result.outcome).toBe('unavailable');
    expect(JSON.stringify(result)).not.toContain('<img');
    expect(result.trace).toMatchObject({ modelReply: null, refusedBy: 'markup' });
  });

  it('refuses text over the limit before any model call', async () => {
    const { app, model } = setup([{ reply: parsedReply }]);
    const response = await post(app, 'x'.repeat(2001));
    expect(response.status).toBe(400);
    expect(model.requests).toHaveLength(0);
  });

  it('answers unavailable daily_cap, never an error, once the daily model call cap is used', async () => {
    const clock = createFakeClock();
    const capped = cappedGemini(clock, 1);
    const app = createApp(createTestDeps({ model: capped.model, clock }).deps);
    expect(await body(await post(app, TEXT))).toMatchObject({ outcome: 'unavailable', reason: 'daily_cap' });
    expect(await body(await post(app, 'One adult.'))).toMatchObject({
      outcome: 'unavailable',
      reason: 'daily_cap',
    });
    expect(capped.fetch).toHaveBeenCalledTimes(1);
  });
});
