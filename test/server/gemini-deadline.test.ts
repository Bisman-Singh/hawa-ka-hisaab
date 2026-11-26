// Tests for the adapter's time limits: the request deadline, a turn for each model, and no server deadline header,
// which the API refuses under 10 seconds.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ModelRequest } from '../../src/lib/model.js';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { createGeminiModel, type GeminiOptions } from '../../src/server/gemini.js';
import { createFakeClock } from '../support/fake-clock.js';
import { scripted, textReply } from '../support/fake-gemini.js';

const request = (deadline?: number): ModelRequest<{ text: string }> => ({
  task: 'ask',
  instructions: 'Answer the question in DATA.',
  data: 'A question.',
  facts: [],
  schema: z.strictObject({ text: z.string() }),
  tools: [],
  ...(deadline === undefined ? {} : { deadline }),
});

function options(fetch: GeminiOptions['fetch'], overrides: Partial<GeminiOptions> = {}): GeminiOptions {
  const clock = createFakeClock();
  return {
    apiKey: 'test-key-not-real',
    models: ['model-a', 'model-b'],
    timeoutMs: 5000,
    attemptMs: 5000,
    callCap: createFixedWindowLimiter({ limit: 100, windowMs: 86_400_000, maxKeys: 1, clock }),
    clock,
    fetch,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('createGeminiModel time limits', () => {
  it('gives the next model the rest of the time when one hangs past its own turn', async () => {
    vi.useFakeTimers();
    const clock = { now: () => Date.now() };
    const hang = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(textReply('{"text":"ok"}')),
    );
    fetch.mockImplementationOnce(hang);
    const model = createGeminiModel(options(fetch, { timeoutMs: 15_000, attemptMs: 4000, clock }));
    const pending = model.generate(request());
    await vi.advanceTimersByTimeAsync(4001);
    const reply = await pending;
    expect(reply.ok ? reply.value.modelId : null).toBe('model-b');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('never sends a server deadline header, which the API refuses under 10 seconds', async () => {
    const { fetch, sent } = scripted([() => textReply('{"text":"ok"}')]);
    await createGeminiModel(options(fetch)).generate(request(createFakeClock().now() + 4000));
    expect(sent[0]?.headers.has('x-server-timeout')).toBe(false);
  });

  it('sends nothing once the request deadline has passed, though its own limit would allow the call', async () => {
    const clock = createFakeClock();
    const { fetch } = scripted([() => textReply('{"text":"ok"}')]);
    const model = createGeminiModel(options(fetch, { clock }));
    expect((await model.generate(request(clock.now() + 4000))).ok).toBe(true);
    expect(await model.generate(request(clock.now()))).toEqual({
      ok: false,
      error: { kind: 'timeout' },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
