// Tests for POST /api/notice through the whole app: the rules notice with its facts and actions, the model's
// rewording under the guards and the notice's own checks, GRAP only in Delhi NCR, the limit, the cap and the cache.
import { describe, expect, it } from 'vitest';
import { noticeResponseSchema } from '../../../src/features/community/contract.js';
import { COMMUNITY_SAMPLES } from '../../../src/features/community/samples.js';
import { createFixedWindowLimiter } from '../../../src/lib/rate-limit.js';
import { createApp } from '../../../src/server/app.js';
import type { ServerDeps } from '../../../src/server/deps.js';
import { createFakeClock } from '../../support/fake-clock.js';
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

const [society, school] = COMMUNITY_SAMPLES.map((sample) => sample.input);

function setup(overrides: Partial<ServerDeps> = {}, place = PLACES.delhi) {
  const clock = createFakeClock(MORNING_MS);
  const test = createTestDeps({ clock, air: airAt(place, AQI_AT.severe), ...overrides });
  return { ...test, clock, app: createApp(test.deps) };
}

async function notice(app: ReturnType<typeof createApp>, community: unknown, location = PLACES.delhi) {
  const response = await app.request('/api/notice', jsonPost({ community, location }));
  expect(response.status).toBe(200);
  return noticeResponseSchema.parse(await response.json());
}

describe('POST /api/notice', () => {
  it('serves the rules notice in both languages with its facts and actions, labelled disabled, with no key', async () => {
    const test = setup();
    const result = await notice(test.app, society);
    expect(result.trace).toMatchObject({ producedBy: 'rules', fallbackReason: 'disabled' });
    expect(result.notice.en.title).toBe('Air quality notice for residents, 24 Nov 2026');
    expect(result.notice.hi?.title).toBe('निवासियों के लिए वायु गुणवत्ता सूचना, 24 नवंबर 2026');
    expect(result.notice.en.lines[0]).toMatch(/Severe, with an AQI of 433/);
    expect(result.actions.map((action) => action.id)).toContain('grap-stage');
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.trace.factsSent.some((fact) => fact.id === 'grap-stage-order')).toBe(true);
    expect(test.logText()).not.toMatch(/generator|Sector/);
  });

  it('says nothing about GRAP outside Delhi NCR', async () => {
    const result = await notice(setup({}, PLACES.mumbai).app, school, PLACES.mumbai);
    expect(result.actions.map((action) => action.id)).not.toContain('grap-stage');
    expect(JSON.stringify(result.notice)).not.toMatch(/GRAP|CAQM/);
  });

  it('serves the model wording with the code-written opening and closing kept', async () => {
    const result = await notice(setup({ model: behavingModel('good') }).app, school);
    expect(result.trace).toMatchObject({ producedBy: 'model', fallbackReason: null });
    expect(result.notice.en.lines[1]).toMatch(/^Please note\. /);
    expect(result.notice.en.lines[0]).toMatch(/^Dear parents and staff/);
    expect(result.notice.hi?.lines.at(-1)).toMatch(/डॉक्टर को दिखाएँ।$/);
  });

  it('serves the rules notice when the wording changes an action, writes HTML or invents a number', async () => {
    for (const [behaviour, reason] of [
      ['unknown_ids', 'invalid_reply'],
      ['html', 'invalid_reply'],
      ['invents_number', 'number_check_failed'],
    ] satisfies [Parameters<typeof behavingModel>[0], string][]) {
      const result = await notice(setup({ model: behavingModel(behaviour) }).app, society);
      expect(result.trace).toMatchObject({ producedBy: 'rules', fallbackReason: reason });
      expect(result.notice.en.lines[1]).not.toMatch(/^Please note/);
    }
  });

  it('answers on the rules path over the client limit and once the daily cap is used', async () => {
    const clock = createFakeClock(MORNING_MS);
    const modelLimiter = createFixedWindowLimiter({ limit: 0, windowMs: 60_000, maxKeys: 10, clock });
    const limited = await notice(setup({ clock, model: behavingModel('good'), modelLimiter }).app, society);
    expect(limited.trace.fallbackReason).toBe('rate_limited');
    const capped = cappedGemini(clock, 1);
    const { app } = setup({ clock, model: capped.model });
    expect((await notice(app, society)).trace.fallbackReason).toBe('daily_cap');
    expect((await notice(app, school)).trace.fallbackReason).toBe('daily_cap');
    expect(capped.fetch).toHaveBeenCalledTimes(1);
  });

  it('answers the same society again from the cache, marked cached', async () => {
    const model = behavingModel('good');
    const { app } = setup({ model });
    const first = await notice(app, society);
    expect((await notice(app, society)).trace.cached).toBe(true);
    expect(first.trace.cached).toBe(false);
    expect(model.requests).toHaveLength(1);
  });
});
