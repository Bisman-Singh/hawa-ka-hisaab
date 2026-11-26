// Tests for building the model port from the environment: the model order, the daily cap and the no-key path.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readServerEnv, type ServerEnv } from '../../src/config/env.js';
import { disabledModel } from '../../src/lib/model.js';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { createGeminiModel } from '../../src/server/gemini.js';
import { createModelFromEnv, DEFAULT_MODEL_ORDER, parseModelOrder } from '../../src/server/model-config.js';
import { createFakeClock } from '../support/fake-clock.js';

function env(source: Record<string, string>): ServerEnv {
  const parsed = readServerEnv(source);
  if (!parsed.ok) {
    throw new Error('test environment is invalid');
  }
  return parsed.value;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseModelOrder', () => {
  it('uses the measured default order when nothing is set', () => {
    expect(parseModelOrder(null)).toEqual({ ok: true, value: DEFAULT_MODEL_ORDER });
    expect(DEFAULT_MODEL_ORDER.length).toBeGreaterThanOrEqual(2);
  });

  it('reads a comma separated list in order, trimmed and without repeats', () => {
    expect(parseModelOrder(' gemini-x , gemini-y,gemini-x,, ')).toEqual({
      ok: true,
      value: ['gemini-x', 'gemini-y'],
    });
    expect(parseModelOrder('gemini-3.5-flash-lite')).toEqual({ ok: true, value: ['gemini-3.5-flash-lite'] });
  });

  it.each([
    'models/gemini x',
    'Gemini',
    ',',
    'a'.repeat(70),
    Array.from({ length: 9 }, (_, i) => `m${String(i)}`).join(','),
  ])('rejects %j', (value) => {
    expect(parseModelOrder(value).ok).toBe(false);
  });
});

describe('createModelFromEnv', () => {
  it('returns the disabled port with no key, and pipelines then never reach the network', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const model = createModelFromEnv(env({}), createFakeClock());
    expect(model).toBe(disabledModel);
    const reply = await model.generate({
      task: 'intake',
      instructions: 'x',
      data: 'y',
      facts: [],
      schema: z.string(),
      tools: [],
    });
    expect(reply).toEqual({ ok: false, error: { kind: 'disabled' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns the disabled port when the daily cap is 0', () => {
    expect(
      createModelFromEnv(env({ GEMINI_API_KEY: 'k', MODEL_DAILY_CALL_CAP: '0' }), createFakeClock()),
    ).toBe(disabledModel);
  });

  it('gives a Gemini port with no models no id, and it fails without a call', async () => {
    const port = createGeminiModel({
      apiKey: 'k',
      models: [],
      timeoutMs: 1000,
      attemptMs: 1000,
      callCap: createFixedWindowLimiter({ limit: 1, windowMs: 1000, maxKeys: 1, clock: createFakeClock() }),
      clock: createFakeClock(),
    });
    expect(port.modelId).toBeNull();
    const reply = await port.generate({
      task: 'ask',
      instructions: 'x',
      data: 'y',
      facts: [],
      schema: z.string(),
      tools: [],
    });
    expect(reply).toEqual({ ok: false, error: { kind: 'upstream' } });
  });

  it('builds a Gemini port with the configured order', () => {
    const model = createModelFromEnv(
      env({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-y,gemini-x' }),
      createFakeClock(),
    );
    expect(model.modelId).toBe('gemini-y');
  });

  it('stops startup on a bad model list, naming the variable only', () => {
    const build = () =>
      createModelFromEnv(env({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'bad model' }), createFakeClock());
    expect(build).toThrow('Invalid environment variables: GEMINI_MODEL');
    expect(build).not.toThrow(/bad model/);
  });
});
