// Tests for POST /api/plan through the whole app: the model and rules paths with their labels, Hindi, the what-if
// context, the per-client limit, the daily cap, the short cache, the deadline and the logs.
import { describe, expect, it } from 'vitest';
import { MIN_MODEL_CALL_MS, ROUTE_DEADLINE_MS } from '../../../src/config/limits.js';
import { readAir } from '../../../src/features/air/service.js';
import type { Guarded } from '../../../src/features/assistant/guarded.js';
import { MODEL_CACHE_TTL_MS } from '../../../src/features/assistant/reply-cache.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { planResponseSchema } from '../../../src/features/planner/contract.js';
import { contextAt } from '../../../src/features/planner/request-context.js';
import type { PlanWording } from '../../../src/features/planner/types.js';
import { whatIfEffects } from '../../../src/features/planner/what-if.js';
import type { Trace } from '../../../src/lib/types.js';
import { createFixedWindowLimiter } from '../../../src/lib/rate-limit.js';
import { createApp } from '../../../src/server/app.js';
import type { ServerDeps } from '../../../src/server/deps.js';
import { planFromModel } from '../../../src/server/routes/plan.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { notInHindi, sample as sampleHousehold } from '../../support/plan-fixtures.js';
import { sampleTrace } from '../../support/samples.js';
import {
  AQI_AT,
  airAt,
  behavingModel,
  cappedGemini,
  jsonPost,
  MORNING_MS,
  PLACES,
  slowAirAt,
} from '../../support/route-fixtures.js';
import { createTestDeps } from '../../support/test-deps.js';

const household = sampleHousehold('family-car-asthma');
const body = { household, location: PLACES.delhi, language: 'en' };

function setup(overrides: Partial<ServerDeps> = {}) {
  const clock = createFakeClock(MORNING_MS);
  const test = createTestDeps({ clock, air: airAt(PLACES.delhi, AQI_AT.severe), ...overrides });
  return { ...test, clock, app: createApp(test.deps) };
}

async function plan(app: ReturnType<typeof createApp>, sent: unknown = body) {
  const response = await app.request('/api/plan', jsonPost(sent));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  return planResponseSchema.parse(await response.json());
}

describe('POST /api/plan', () => {
  it('answers on the rules path, labelled disabled, when no key is set, and logs no household detail', async () => {
    const test = setup();
    const result = await plan(test.app);
    expect(result.trace).toMatchObject({ producedBy: 'rules', fallbackReason: 'disabled', modelId: null });
    expect(result.plan).toMatchObject({
      dayKind: 'severe',
      band: 'severe',
      date: '2026-11-24',
      language: 'en',
    });
    expect(result.airBasis).toEqual({
      path: 'station',
      band: 'severe',
      readingHour: '2026-11-24T05:00:00+05:30',
      forecastIssuedAt: '2026-11-24T00:00:00+05:30',
    });
    expect(test.logText()).toContain('model_fallback');
    expect(test.logText()).not.toMatch(/commute|asthma|08:30/);
  });

  it('sends the air facts with the plan facts and words the plan with the model', async () => {
    const model = behavingModel('good');
    const result = await plan(setup({ model }).app);
    expect(result.trace).toMatchObject({ producedBy: 'model', fallbackReason: null, modelId: 'fake-model' });
    expect(result.plan.headline).toBe('The AQI was 433 at 05:00.');
    expect(result.trace.factsSent.slice(0, 3).map((fact) => [fact.id, fact.value])).toEqual([
      ['air-aqi', 433],
      ['air-reading-time', 5],
      ['air-reading-time', 0],
    ]);
    expect(JSON.parse(model.requests[0]?.data ?? '{}')).toMatchObject({
      language: 'en',
      air: { aqi: 433, band: 'severe' },
    });
  });

  it('words the plan in Hindi, Devanagari digits included, under the same guards', async () => {
    const result = await plan(setup({ model: behavingModel('good') }).app, { ...body, language: 'hi' });
    expect(result.plan.language).toBe('hi');
    expect(result.plan.headline).toBe('आज सुबह का एक्यूआई ४३३ है।');
    const invented = await plan(setup({ model: behavingModel('invents_number') }).app, {
      ...body,
      language: 'hi',
    });
    expect(invented.trace).toMatchObject({
      fallbackReason: 'number_check_failed',
      numberCheck: { unmatched: ['999'] },
    });
    expect(invented.plan.language).toBe('hi');
    expect(notInHindi(invented.plan)).toEqual([]);
  });

  it('sends what the browser needs to recompute a toggle exactly as the server would', async () => {
    const result = await plan(setup().app);
    expect(result.whatIfContext?.notBefore).toBe('06:00');
    const air = await readAir(airAt(PLACES.delhi, AQI_AT.severe), createFakeClock(MORNING_MS), PLACES.delhi);
    const server = contextAt(household, air, MORNING_MS);
    const sent = { curve: null, notBefore: null, ...result.whatIfContext };
    const browser = { household, band: result.plan.band, date: result.plan.date, ...sent };
    const items = [
      ...result.plan.slots.morning,
      ...result.plan.slots.afternoon,
      ...result.plan.slots.evening,
    ];
    const toggles = items.flatMap((item) => item.whatIfs);
    expect(toggles.length).toBeGreaterThan(0);
    for (const toggle of toggles) {
      expect(whatIfEffects(browser, toggle.patch)).toEqual(whatIfEffects(server, toggle.patch));
    }
  });

  it('answers on the rules path, labelled rate_limited, without asking the model over the client limit', async () => {
    const clock = createFakeClock(MORNING_MS);
    const modelLimiter = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10, clock });
    const model = behavingModel('good');
    const { app } = setup({ clock, model, modelLimiter });
    expect((await plan(app)).trace.producedBy).toBe('model');
    const second = await plan(app, { ...body, language: 'hi' });
    expect(second.trace).toMatchObject({ producedBy: 'rules', fallbackReason: 'rate_limited' });
    expect(model.requests).toHaveLength(1);
  });

  it('stops calling the model host once the daily cap is used, a retry counted, and says daily_cap', async () => {
    const clock = createFakeClock(MORNING_MS);
    const { model, fetch } = cappedGemini(clock, 1);
    const { app } = setup({ clock, model });
    expect((await plan(app)).trace).toMatchObject({ producedBy: 'rules', fallbackReason: 'daily_cap' });
    expect((await plan(app, { ...body, language: 'hi' })).trace.fallbackReason).toBe('daily_cap');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('answers an identical request from the cache, marked cached, without a model call or a unit', async () => {
    const clock = createFakeClock(MORNING_MS);
    const modelLimiter = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10, clock });
    const model = behavingModel('good');
    const { app } = setup({ clock, model, modelLimiter });
    const first = await plan(app);
    const second = await plan(app);
    expect(second).toEqual({ ...first, trace: { ...first.trace, cached: true } });
    expect(model.requests).toHaveLength(1);
    clock.advance(MODEL_CACHE_TTL_MS);
    expect((await plan(app)).trace).toMatchObject({ cached: false, producedBy: 'model' });
    expect(model.requests).toHaveLength(2);
  });

  it('starts no model call when the air reads used up the deadline, and says timeout', async () => {
    const clock = createFakeClock(MORNING_MS);
    const model = behavingModel('good');
    const air = slowAirAt(PLACES.delhi, AQI_AT.severe, {
      clock,
      takesMs: ROUTE_DEADLINE_MS - MIN_MODEL_CALL_MS + 1,
    });
    const result = await plan(setup({ clock, model, air }).app);
    expect(result.trace).toMatchObject({ producedBy: 'rules', fallbackReason: 'timeout' });
    expect(model.requests).toHaveLength(0);
  });

  it('refuses a body with air values the client should never send', async () => {
    const response = await setup().app.request('/api/plan', jsonPost({ ...body, aqi: 50 }));
    expect(response.status).toBe(400);
  });
});

describe('planFromModel', () => {
  it('serves the rules plan labelled invalid_reply when a checked wording names a candidate that was not sent', async () => {
    const air = await readAir(airAt(PLACES.delhi, AQI_AT.severe), createFakeClock(MORNING_MS), PLACES.delhi);
    const ctx = contextAt(household, air, MORNING_MS);
    const set = buildCandidates(ctx);
    const trace: Trace = { ...sampleTrace(), producedBy: 'model', modelReply: '{"headline":"Today."}' };
    const value: PlanWording = {
      headline: 'Today.',
      items: [{ candidateId: 'made-up', title: 'x', why: 'y', tradeOff: null }],
    };
    const worded: Guarded<PlanWording> = { kind: 'checked', value, trace };
    const result = planFromModel({ ctx, set, language: 'en' }, worded);
    expect(result.trace).toMatchObject({
      producedBy: 'rules',
      fallbackReason: 'invalid_reply',
      modelReply: null,
      refusedBy: 'ids',
    });
    expect(result.plan.language).toBe('en');
  });
});
