// Tests for the bounds on Gemini calls through the real SDK and a scripted fetch: the request budget per HTTP call,
// no tools on the last allowed call, and a minute's rest for a model after its quota error.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineTool, type CallBudget, type ModelRequest } from '../../src/lib/model.js';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { createGeminiModel, type GeminiOptions } from '../../src/server/gemini.js';
import { QUOTA_PAUSE_MS } from '../../src/server/gemini-limits.js';
import { createFakeClock } from '../support/fake-clock.js';
import { apiError, callReply, scripted, textReply } from '../support/fake-gemini.js';

const replySchema = z.strictObject({ text: z.string() });
const tool = defineTool({
  name: 'activity_options',
  description: 'Options for an activity.',
  parameters: z.strictObject({ activityId: z.string() }),
  run: () => ({ found: true }),
});

function budget(size: number): CallBudget & { readonly taken: () => number } {
  let used = 0;
  return {
    take: () => {
      used += 1;
      return Promise.resolve(used <= size);
    },
    left: () => Math.max(0, size - used),
    taken: () => used,
  };
}

function request(spend: CallBudget, tools = [tool]): ModelRequest<{ text: string }> {
  return {
    task: 'ask',
    instructions: 'Answer.',
    data: 'q',
    facts: [],
    schema: replySchema,
    tools,
    budget: spend,
  };
}

function options(fetch: GeminiOptions['fetch'], clock = createFakeClock()): GeminiOptions {
  return {
    apiKey: 'test-key-not-real',
    models: ['model-a', 'model-b', 'model-c'],
    timeoutMs: 5000,
    attemptMs: 5000,
    callCap: createFixedWindowLimiter({ limit: 100, windowMs: 86_400_000, maxKeys: 1, clock }),
    clock,
    fetch,
  };
}

const toolCall = () => callReply([{ name: 'activity_options', args: { activityId: 'a1' } }]);

describe('a request budget', () => {
  it('is taken before every HTTP call, tool rounds included, and stops the request when spent', async () => {
    const { fetch } = scripted([toolCall, toolCall, toolCall, () => textReply('{"text":"late"}')]);
    const spend = budget(2);
    const reply = await createGeminiModel(options(fetch)).generate(request(spend));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reply.ok).toBe(false);
  });

  it('turns tools off on the call that spends the last unit, so that call must answer', async () => {
    const { fetch, sent } = scripted([toolCall, () => textReply('{"text":"done"}')]);
    const reply = await createGeminiModel(options(fetch)).generate(request(budget(2)));
    expect(reply.ok ? reply.value.value.text : null).toBe('done');
    const config = z.object({ functionCallingConfig: z.object({ mode: z.string() }) });
    const modes = sent.map((entry) => config.parse(entry.body['toolConfig']).functionCallingConfig.mode);
    expect(modes).toEqual(['AUTO', 'NONE']);
  });

  it('counts model fallbacks too, so three quota errors are three calls at most', async () => {
    const { fetch } = scripted([() => apiError(429, 'RESOURCE_EXHAUSTED')]);
    const spend = budget(2);
    expect(await createGeminiModel(options(fetch)).generate(request(spend, []))).toEqual({
      ok: false,
      error: { kind: 'rate_limited' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('quota rest', () => {
  it('skips a model for a minute after its quota error, and calls none while every model rests', async () => {
    const clock = createFakeClock();
    const { fetch } = scripted([() => apiError(429, 'RESOURCE_EXHAUSTED')]);
    const model = createGeminiModel(options(fetch, clock));
    const unbounded = budget(10);
    expect(await model.generate(request(unbounded, []))).toEqual({ ok: false, error: { kind: 'quota' } });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(await model.generate(request(budget(10), []))).toEqual({ ok: false, error: { kind: 'quota' } });
    expect(fetch).toHaveBeenCalledTimes(3);
    clock.advance(QUOTA_PAUSE_MS + 1);
    await model.generate(request(budget(10), []));
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it('still tries a model that is not resting', async () => {
    const clock = createFakeClock();
    const { fetch } = scripted([() => apiError(429, 'RESOURCE_EXHAUSTED'), () => textReply('{"text":"b"}')]);
    const model = createGeminiModel(options(fetch, clock));
    expect((await model.generate(request(budget(10), []))).ok).toBe(true);
    const reply = await model.generate(request(budget(10), []));
    expect(reply.ok ? reply.value.modelId : null).toBe('model-b');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
