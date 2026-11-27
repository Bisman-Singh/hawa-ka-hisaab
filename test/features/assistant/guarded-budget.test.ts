// Tests for the call budget of one request: at most MAX_MODEL_CALLS_PER_REQUEST HTTP calls, each a unit of the
// client limit, the first using the unit taken before the model is asked, and no retry once the budget is spent.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  MAX_MODEL_CALLS_PER_REQUEST,
  runGuarded,
  type GuardedTask,
} from '../../../src/features/assistant/guarded.js';
import type { ModelPort } from '../../../src/lib/model.js';
import { createFakeModel } from '../../support/fake-model.js';
import { ALLOWED, LIMITED, testRun } from '../../support/model-run.js';

const schema = z.strictObject({ text: z.string() });

function task(): GuardedTask<{ text: string }> {
  return {
    request: { task: 'ask', instructions: 'Answer.', data: '{}', facts: [], schema, tools: [] },
    sources: () => [],
    prose: (reply) => [reply.text],
    check: () => null,
  };
}

describe('the call budget', () => {
  it('bounds a request to MAX_MODEL_CALLS_PER_REQUEST calls, each a unit of the client limit, with no retry after', async () => {
    let takes = 0;
    const greedy: ModelPort = {
      modelId: 'greedy',
      generate: async (request) => {
        for (let call = 0; call < 5; call += 1) {
          if (await request.budget?.take()) {
            takes += 1;
          }
        }
        return {
          ok: false,
          error: { kind: 'invalid_reply', reply: { rawText: '{"text":"999"}', modelId: 'greedy' } },
        };
      },
    };
    const run = testRun<{ text: string }>(greedy);
    const result = await runGuarded(run, task());
    expect(takes).toBe(MAX_MODEL_CALLS_PER_REQUEST);
    expect(run.allowCalls()).toBe(MAX_MODEL_CALLS_PER_REQUEST);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(result.trace.numberCheck.attempts).toBe(1);
  });

  it('lets the first call use the unit taken before the model is asked, so one call costs one unit', async () => {
    let left = -1;
    const once: ModelPort = {
      modelId: 'once',
      generate: async (request) => {
        await request.budget?.take();
        left = request.budget?.left() ?? -1;
        const parsed = request.schema.safeParse({ text: 'Fine.' });
        return parsed.success
          ? {
              ok: true,
              value: { value: parsed.data, rawText: '{"text":"Fine."}', modelId: 'once', toolCalls: [] },
            }
          : { ok: false, error: { kind: 'invalid_reply' } };
      },
    };
    const run = testRun<{ text: string }>(once);
    expect((await runGuarded(run, task())).kind).toBe('checked');
    expect(run.allowCalls()).toBe(1);
    expect(left).toBe(MAX_MODEL_CALLS_PER_REQUEST - 1);
  });

  it('stops a later call when the client limit refuses it mid request', async () => {
    let decisions = 0;
    const run = { ...testRun<{ text: string }>(createFakeModel([{ reply: { text: 'Fine.' } }])) };
    const limited = {
      ...run,
      allow: () => Promise.resolve(decisions++ === 0 ? ALLOWED : LIMITED),
    };
    let second = true;
    const twice: ModelPort = {
      modelId: 'twice',
      generate: async (request) => {
        await request.budget?.take();
        second = (await request.budget?.take()) ?? true;
        return { ok: false, error: { kind: 'rate_limited' } };
      },
    };
    const result = await runGuarded({ ...limited, model: twice }, task());
    expect(second).toBe(false);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'rate_limited' });
  });
});
