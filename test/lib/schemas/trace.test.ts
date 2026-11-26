// Tests for the trace shown in the "how this was made" panel.
import { describe, expect, it } from 'vitest';
import {
  fallbackReasonSchema,
  modelFailureKindSchema,
  toolCallSchema,
} from '../../../src/lib/schemas/trace.js';
import { traceSchema } from '../../../src/lib/schemas/trace.js';
import { sampleTrace } from '../../support/samples.js';

describe('traceSchema', () => {
  it('accepts a rules path trace and a model trace with tool calls', () => {
    expect(traceSchema.safeParse(sampleTrace()).success).toBe(true);
    const model = {
      ...sampleTrace(),
      producedBy: 'model',
      modelId: 'test-model',
      fallbackReason: null,
      modelReply: '{"ok":true}',
      toolCalls: [{ name: 'trip_co2', args: { km: 4 }, result: { kgCo2: 1 }, failure: null }],
      numberCheck: { status: 'passed', attempts: 1, unmatched: [] },
    };
    expect(traceSchema.safeParse(model).success).toBe(true);
  });

  it('refuses an unknown producer and more than two attempts', () => {
    expect(traceSchema.safeParse({ ...sampleTrace(), producedBy: 'guess' }).success).toBe(false);
    const numberCheck = { status: 'failed', attempts: 3, unmatched: ['42'] };
    expect(traceSchema.safeParse({ ...sampleTrace(), numberCheck }).success).toBe(false);
  });
});

describe('fallback reasons', () => {
  it('cover every model failure and a failed number check', () => {
    for (const kind of modelFailureKindSchema.options) {
      expect(fallbackReasonSchema.safeParse(kind).success).toBe(true);
    }
    expect(fallbackReasonSchema.safeParse('number_check_failed').success).toBe(true);
    expect(fallbackReasonSchema.safeParse('felt_like_it').success).toBe(false);
  });
});

describe('toolCallSchema', () => {
  it('records each way a tool call can fail', () => {
    for (const failure of ['unknown_tool', 'invalid_arguments', 'failed']) {
      expect(toolCallSchema.safeParse({ name: 't', args: {}, result: null, failure }).success).toBe(true);
    }
  });

  it('requires object arguments', () => {
    expect(toolCallSchema.safeParse({ name: 't', args: [1], result: null, failure: null }).success).toBe(
      false,
    );
  });
});
