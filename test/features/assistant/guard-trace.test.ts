// Tests for the trace builders: the trace schema's limits, the number check states and the fixed reply trace.
import { describe, expect, it } from 'vitest';
import { checkOf, fixedReplyTrace, traceOf } from '../../../src/features/assistant/guard-trace.js';
import { traceSchema } from '../../../src/lib/schemas/trace.js';

describe('fixedReplyTrace', () => {
  it('says the reply was written in code and no model was asked', () => {
    expect(fixedReplyTrace()).toEqual({
      producedBy: 'fixed_reply',
      modelId: null,
      fallbackReason: null,
      factsSent: [],
      modelReply: null,
      toolCalls: [],
      numberCheck: { status: 'not_run', attempts: 0, unmatched: [] },
      cached: false,
    });
  });

  it('lists the facts behind the numbers its text states', () => {
    const fact = {
      id: 'india-emergency-number',
      label: 'Emergency number',
      value: 112,
      unit: 'phone number',
    };
    expect(fixedReplyTrace([fact]).factsSent).toEqual([fact]);
  });
});

describe('traceOf and checkOf', () => {
  it('cuts the reply and the tool calls to the schema limits and labels a fallback as rules', () => {
    const call = { name: 'tool', args: {}, result: 1, failure: null };
    const reply = {
      rawText: 'x'.repeat(90_000),
      modelId: 'm',
      toolCalls: Array.from({ length: 30 }, () => call),
    };
    const trace = traceOf([], {
      reason: 'quota',
      reply,
      check: checkOf({ passed: false, unmatched: ['9'] }, 2),
    });
    expect(traceSchema.safeParse(trace).success).toBe(true);
    expect(trace).toMatchObject({
      producedBy: 'rules',
      fallbackReason: 'quota',
      numberCheck: { status: 'failed' },
    });
    expect(trace.toolCalls).toHaveLength(20);
  });
});
