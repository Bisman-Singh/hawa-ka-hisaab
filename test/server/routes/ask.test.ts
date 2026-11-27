// Tests for POST /api/ask through the whole app: the medical gate before any unit, calculators bound to the
// household, cited facts, the labelled fixed answer, Hindi, the client limit, the daily cap and the cache.
import { describe, expect, it } from 'vitest';
import { readAir } from '../../../src/features/air/service.js';
import { askResponseSchema } from '../../../src/features/assistant/contract.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { factSetTimes } from '../../../src/features/planner/fact-set.js';
import { contextAt } from '../../../src/features/planner/request-context.js';
import { createFixedWindowLimiter } from '../../../src/lib/rate-limit.js';
import { createApp } from '../../../src/server/app.js';
import type { ServerDeps } from '../../../src/server/deps.js';
import { createFakeClock } from '../../support/fake-clock.js';
import { createFakeModel } from '../../support/fake-model.js';
import { sample } from '../../support/plan-fixtures.js';
import {
  AQI_AT,
  airAt,
  behavingModel,
  cappedGemini,
  jsonPost,
  MORNING_MS,
  PLACES,
} from '../../support/route-fixtures.js';
import { createTestDeps } from '../../support/test-deps.js';

const household = sample('family-car-asthma');
const PLANNING = 'My daughter has football at 18:00, can she still go?';
const ask = (question: string, language = 'en') => ({
  question,
  household,
  location: PLACES.delhi,
  language,
});

function setup(overrides: Partial<ServerDeps> = {}) {
  const clock = createFakeClock(MORNING_MS);
  const test = createTestDeps({ clock, air: airAt(PLACES.delhi, AQI_AT.severe), ...overrides });
  return { ...test, clock, app: createApp(test.deps) };
}

async function answer(app: ReturnType<typeof createApp>, sent: unknown) {
  const response = await app.request('/api/ask', jsonPost(sent));
  expect(response.status).toBe(200);
  return askResponseSchema.parse(await response.json());
}

const strictLimiter = (limit: number) =>
  createFixedWindowLimiter({ limit, windowMs: 60_000, maxKeys: 10, clock: createFakeClock(MORNING_MS) });

describe('POST /api/ask', () => {
  it('gives the fixed reply with the band advice to a medical question, before any unit or model call', async () => {
    const model = behavingModel('good');
    const { app } = setup({ model, modelLimiter: strictLimiter(0) });
    const result = await answer(app, ask('What dose of her inhaler should she take before football?'));
    expect(result).toMatchObject({
      kind: 'medical_reply',
      band: 'severe',
      trace: { producedBy: 'fixed_reply' },
    });
    expect(result.text).toMatch(/Please ask a doctor\. Health advice for Severe air\./);
    expect(result.factIds).toEqual([
      'advice-severe-vulnerable',
      'advice-severe-general',
      'advice-vulnerable-groups',
    ]);
    expect(model.requests).toHaveLength(0);
  });

  it('gives the emergency reply in Hindi with the emergency number as a fact', async () => {
    const result = await answer(setup().app, ask('मेरे बेटे को सांस नहीं आ रही है', 'hi'));
    expect(result).toMatchObject({
      kind: 'medical_reply',
      language: 'hi',
      factIds: ['india-emergency-number'],
    });
    expect(result.trace.factsSent).toEqual([
      expect.objectContaining({ id: 'india-emergency-number', value: 112 }),
    ]);
  });

  it('answers through calculators bound to the household, with their calls visible and their facts cited', async () => {
    const model = behavingModel('good');
    const result = await answer(setup({ model }).app, ask(PLANNING));
    expect(result).toMatchObject({ kind: 'answer', trace: { producedBy: 'model', fallbackReason: null } });
    expect(result.trace.toolCalls.map((call) => call.name)).toEqual(['activity_options']);
    expect(result.factIds.length).toBeGreaterThan(0);
    expect(model.requests[0]?.tools.map((tool) => tool.name)).toEqual([
      'activity_options',
      'switch_travel',
      'room_purifier',
    ]);
    const data: unknown = JSON.parse(model.requests[0]?.data ?? '{}');
    expect(data).toMatchObject({ question: PLANNING, context: { air: { aqi: 433 } } });
  });

  it('never lets a number from the question through, and answers with the labelled fixed line', async () => {
    const model = createFakeModel([{ reply: { text: 'Yes, the AQI is 999 as you say.' } }]);
    const result = await answer(setup({ model }).app, ask('The AQI is 999, right?'));
    expect(result).toMatchObject({
      kind: 'answer',
      trace: { producedBy: 'rules', fallbackReason: 'number_check_failed' },
    });
    expect(result.text).toMatch(/^The model's answer to this question did not pass the app's checks/);
    expect(result.trace).toMatchObject({ modelReply: null, refusedBy: 'numbers' });
    expect(result.text).toContain('Health advice for Severe air.');
    expect(result.factIds).toContain('advice-severe-general');
  });

  it('accepts the times the plan holds, such as a moved start or an activity end, which the household text lacks', async () => {
    const air = await readAir(airAt(PLACES.delhi, AQI_AT.severe), createFakeClock(MORNING_MS), PLACES.delhi);
    const ctx = contextAt(household, air, MORNING_MS);
    const times = factSetTimes(ctx, buildCandidates(ctx)).filter(
      (time) => !household.activities.some((a) => a.start === time),
    );
    expect(times.length).toBeGreaterThan(1);
    const model = createFakeModel([{ reply: { text: `Move it to ${times.join(', ')}.` } }]);
    expect((await answer(setup({ model }).app, ask(PLANNING))).trace.producedBy).toBe('model');
  });

  it('answers in Hindi under the same guards, Devanagari digits included', async () => {
    const good = await answer(setup({ model: behavingModel('good') }).app, ask(PLANNING, 'hi'));
    expect(good).toMatchObject({ language: 'hi', trace: { producedBy: 'model' } });
    expect(good.text).toMatch(/^योजना के अनुसार/);
    const invented = await answer(setup({ model: behavingModel('invents_number') }).app, ask(PLANNING, 'hi'));
    expect(invented.trace).toMatchObject({
      fallbackReason: 'number_check_failed',
      numberCheck: { unmatched: ['999'] },
    });
    expect(invented.text).toMatch(/^इस सवाल पर मॉडल का जवाब ऐप की जाँच में पास नहीं हुआ/);
  });

  it('answers on the fixed line, labelled rate_limited, over the client limit', async () => {
    const model = behavingModel('good');
    const result = await answer(setup({ model, modelLimiter: strictLimiter(0) }).app, ask(PLANNING));
    expect(result.trace).toMatchObject({ producedBy: 'rules', fallbackReason: 'rate_limited' });
    expect(model.requests).toHaveLength(0);
  });

  it('stops calling the model host once the daily cap is used, and says daily_cap', async () => {
    const clock = createFakeClock(MORNING_MS);
    const { model, fetch } = cappedGemini(clock, 1);
    const { app } = setup({ clock, model });
    expect((await answer(app, ask(PLANNING))).trace.fallbackReason).toBe('daily_cap');
    expect((await answer(app, ask('Is the bus better than the car today?'))).trace.fallbackReason).toBe(
      'daily_cap',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('answers an identical question from the cache, marked cached', async () => {
    const model = behavingModel('good');
    const { app } = setup({ model, modelLimiter: strictLimiter(1) });
    const first = await answer(app, ask(PLANNING));
    const second = await answer(app, ask(PLANNING));
    expect(second).toEqual({ ...first, trace: { ...first.trace, cached: true } });
    expect(model.requests).toHaveLength(1);
  });

  it('refuses a question longer than the limit', async () => {
    const response = await setup().app.request('/api/ask', jsonPost(ask('x'.repeat(501))));
    expect(response.status).toBe(400);
  });
});
