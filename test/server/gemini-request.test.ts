// Tests for the per-call settings and the mapping of SDK errors to model failure kinds.
import { ApiError, FunctionCallingConfigMode } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineTool, type ModelRequest } from '../../src/lib/model.js';
import { classify, configFor, withinTime } from '../../src/server/gemini-request.js';

const tool = defineTool({
  name: 'calc',
  description: 'a calculator',
  parameters: z.strictObject({ id: z.string() }),
  run: () => 1,
});

function request(tools: ModelRequest<{ text: string }>['tools']): ModelRequest<{ text: string }> {
  return {
    task: 'ask',
    instructions: 'Answer.',
    data: 'd',
    facts: [],
    schema: z.strictObject({ text: z.string() }),
    tools,
  };
}

describe('configFor', () => {
  it('declares tools in AUTO mode and turns calling off on the final round', () => {
    const open = configFor({ request: request([tool]), marker: 'm', finalRound: false });
    expect(open.toolConfig?.functionCallingConfig?.mode).toBe(FunctionCallingConfigMode.AUTO);
    expect(open.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'calc',
            description: 'a calculator',
            parametersJsonSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id'],
            },
          },
        ],
      },
    ]);
    expect(open.httpOptions).toBeUndefined();
    const last = configFor({ request: request([tool]), marker: 'm', finalRound: true });
    expect(last.toolConfig?.functionCallingConfig?.mode).toBe(FunctionCallingConfigMode.NONE);
  });

  it('turns off SDK retries of continuations and automatic calls, and caps output', () => {
    const config = configFor({ request: request([]), marker: 'm', finalRound: false });
    expect(config).toMatchObject({
      automaticFunctionCalling: { disable: true },
      automaticContinuation: false,
      maxOutputTokens: 4096,
    });
    expect(config.tools).toBeUndefined();
    expect(config.safetySettings).toHaveLength(4);
  });
});

describe('classify', () => {
  it.each([
    [new ApiError({ message: 'x', status: 429 }), { kind: 'quota', next: true }],
    [new ApiError({ message: 'x', status: 503 }), { kind: 'upstream', next: true }],
    [new ApiError({ message: 'x', status: 504 }), { kind: 'upstream', next: true }],
    [new ApiError({ message: 'x', status: 400 }), { kind: 'upstream', next: false }],
    [new DOMException('aborted', 'AbortError'), { kind: 'timeout', next: false }],
    [new DOMException('slow', 'TimeoutError'), { kind: 'timeout', next: false }],
    [new TypeError('fetch failed'), { kind: 'upstream', next: false }],
    ['a thrown string', { kind: 'upstream', next: false }],
  ])('%s', (error, expected) => {
    expect(classify(error)).toEqual(expected);
  });
});

describe('withinTime', () => {
  it('aborts a call that outlasts its time with a timeout error, and leaves a quick call alone', async () => {
    vi.useFakeTimers();
    let reason: unknown = null;
    const slow = withinTime(
      2000,
      (signal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reason = signal.reason;
            reject(new Error('aborted'));
          });
        }),
    );
    const caught = slow.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2001);
    expect(await caught).toMatchObject({ message: 'aborted' });
    expect(reason).toMatchObject({ name: 'TimeoutError' });
    expect(classify(reason)).toEqual({ kind: 'timeout', next: false });
    expect(await withinTime(2000, () => Promise.resolve('done'))).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
