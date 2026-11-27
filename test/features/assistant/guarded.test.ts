// Tests for the guarded runner: the cache, the deadline and the limit come before any call, the schema is checked
// again, one retry when time allows, failures keep the earlier check, and traces stay inside their limits.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { runGuarded, type GuardedTask } from '../../../src/features/assistant/guarded.js';
import { MIN_MODEL_CALL_MS, MIN_RETRY_MS } from '../../../src/config/limits.js';
import type { ModelPort } from '../../../src/lib/model.js';
import { traceSchema } from '../../../src/lib/schemas/trace.js';
import { createFakeClock, type FakeClock } from '../../support/fake-clock.js';
import { createFakeModel, type ModelStep } from '../../support/fake-model.js';
import { LIMITED, testRun } from '../../support/model-run.js';
const schema = z.strictObject({ text: z.string() });

function task(overrides: Partial<GuardedTask<{ text: string }>> = {}): GuardedTask<{ text: string }> {
  return {
    request: { task: 'ask', instructions: 'Answer.', data: '{}', facts: [], schema, tools: [] },
    sources: () => [],
    prose: (reply) => [reply.text],
    check: () => null,
    ...overrides,
  };
}

describe('runGuarded', () => {
  it('checks the schema again, so a port whose check let a bad value through cannot pass it on', async () => {
    let parses = 0;
    const flaky = z.strictObject({ text: z.string() }).refine(() => {
      parses += 1;
      return parses % 2 === 1;
    });
    const model = createFakeModel([{ reply: { text: 'Fine.' } }]);
    const request = { ...task().request, schema: flaky };
    const result = await runGuarded(testRun<{ text: string }>(model), task({ request }));
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(result.trace).toMatchObject({
      modelId: 'fake-model',
      modelReply: null,
      refusedBy: 'schema',
      numberCheck: { status: 'not_run', attempts: 2 },
    });
  });

  it('retries a reply that failed the schema and accepts a good second reply', async () => {
    const model = createFakeModel([{ reply: { wrong: true } }, { reply: { text: 'Fine.' } }]);
    const result = await runGuarded(testRun<{ text: string }>(model), task());
    expect(result.kind).toBe('checked');
    expect(model.requests[1]?.instructions).toMatch(/did not match the required JSON shape/);
    expect(result.trace.numberCheck).toEqual({ status: 'passed', attempts: 2, unmatched: [] });
  });

  it('never carries the text of a refused reply, only which model wrote it and the check that refused it', async () => {
    const model = createFakeModel([{ reply: { wrong: '<script>' } }], 'gemini-test');
    const result = await runGuarded(testRun<{ text: string }>(model), task());
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(result.trace).toMatchObject({ modelId: 'gemini-test', modelReply: null, refusedBy: 'schema' });
    expect(JSON.stringify(result.trace)).not.toContain('script');
    const dose = createFakeModel([{ reply: { text: 'Give him 10 mg tonight.' } }]);
    const refused = await runGuarded(testRun<{ text: string }>(dose), task({ check: () => 'medicine' }));
    expect(refused.trace).toMatchObject({ modelReply: null, refusedBy: 'medicine' });
    expect(JSON.stringify(refused.trace)).not.toContain('10 mg');
  });

  it('does not retry a reply that came back with no text, since there is nothing to correct', async () => {
    const model = createFakeModel([{ failure: 'invalid_reply' }]);
    const empty = await runGuarded(testRun<{ text: string }>(model), task());
    expect(model.requests).toHaveLength(1);
    expect(empty.trace).toMatchObject({ modelId: null, modelReply: null, numberCheck: { attempts: 1 } });
  });

  it('keeps the first check in the trace when the retry hits a model failure', async () => {
    const model = createFakeModel([{ reply: { text: 'AQI 999.' } }, { failure: 'quota' }]);
    const result = await runGuarded(testRun<{ text: string }>(model), task());
    expect(result).toMatchObject({ kind: 'fallback', reason: 'quota' });
    expect(result.trace).toMatchObject({
      producedBy: 'rules',
      modelReply: null,
      refusedBy: 'numbers',
      numberCheck: { status: 'failed', attempts: 2, unmatched: ['999'] },
    });
  });

  it('records a passed number check when a task rule rejected the reply', async () => {
    const model = createFakeModel([{ reply: { text: 'Fine.' } }]);
    const result = await runGuarded(testRun<{ text: string }>(model), task({ check: () => 'ids' }));
    expect(result).toMatchObject({ kind: 'fallback', reason: 'invalid_reply' });
    expect(result.trace.numberCheck).toEqual({ status: 'passed', attempts: 2, unmatched: [] });
  });

  it('allows numbers from facts, sources and tool results', async () => {
    const model = createFakeModel([{ reply: { text: 'Values 3, 7 and 11.' } }]);
    const request = { ...task().request, facts: [{ id: 'f', label: 'f', value: 3, unit: '' }] };
    expect(
      (await runGuarded(testRun<{ text: string }>(model), task({ request, sources: () => [7, 11] }))).kind,
    ).toBe('checked');
  });

  it('keeps every trace inside the trace schema limits', async () => {
    const text = 'x'.repeat(85_000);
    const facts = Array.from({ length: 600 }, (_, index) => ({
      id: `f${String(index)}`,
      label: 'f',
      value: index,
      unit: '',
    }));
    const model = createFakeModel([{ reply: { text } }]);
    const result = await runGuarded(
      testRun<{ text: string }>(model),
      task({ request: { ...task().request, facts } }),
    );
    expect(traceSchema.safeParse(result.trace).success).toBe(true);
    expect(result.trace.modelReply?.length).toBe(80_000);
    expect(result.trace.factsSent).toHaveLength(500);
  });
});

/** A model that takes the given time on the fake clock before each answer. */
function slowModel(steps: readonly ModelStep[], clock: FakeClock, takesMs: number) {
  const inner = createFakeModel(steps);
  const model: ModelPort = {
    modelId: inner.modelId,
    generate: (request) => {
      clock.advance(takesMs);
      return inner.generate(request);
    },
  };
  return { model, requests: inner.requests };
}

describe('runGuarded before any call', () => {
  it('answers an identical request from the cache with no call and no unit, and marks the trace cached', async () => {
    const model = createFakeModel([{ reply: { text: 'Fine.' } }]);
    const run = testRun<{ text: string }>(model);
    const first = await runGuarded(run, task());
    const second = await runGuarded(run, task());
    expect(first.trace.cached).toBe(false);
    expect(second).toEqual({ ...first, trace: { ...first.trace, cached: true } });
    expect(model.requests).toHaveLength(1);
    expect(run.allowCalls()).toBe(1);
  });

  it('asks again when anything in the request differs, and never caches a fallback', async () => {
    const model = createFakeModel([{ failure: 'quota' }, { reply: { text: 'Fine.' } }]);
    const run = testRun<{ text: string }>(model);
    expect((await runGuarded(run, task())).kind).toBe('fallback');
    expect((await runGuarded(run, task())).kind).toBe('checked');
    const other = { ...task().request, data: '{"other":true}' };
    expect((await runGuarded(run, task({ request: other }))).trace.cached).toBe(false);
    expect(model.requests).toHaveLength(3);
  });

  it('never calls the model over the per-client limit', async () => {
    const model = createFakeModel([{ reply: { text: 'Fine.' } }]);
    const result = await runGuarded(testRun<{ text: string }>(model, { decision: LIMITED }), task());
    expect(result).toMatchObject({
      kind: 'fallback',
      reason: 'rate_limited',
      trace: { producedBy: 'rules' },
    });
    expect(result.trace.numberCheck).toEqual({ status: 'not_run', attempts: 0, unmatched: [] });
    expect(model.requests).toHaveLength(0);
  });

  it('starts no call and takes no unit when too little time is left, and says it ran out of time', async () => {
    const model = createFakeModel([{ reply: { text: 'Fine.' } }]);
    const run = testRun<{ text: string }>(model, { leftMs: MIN_MODEL_CALL_MS - 1 });
    expect(await runGuarded(run, task())).toMatchObject({ kind: 'fallback', reason: 'timeout' });
    expect(model.requests).toHaveLength(0);
    expect(run.allowCalls()).toBe(0);
    const enough = testRun<{ text: string }>(model, { leftMs: MIN_MODEL_CALL_MS });
    expect((await runGuarded(enough, task())).kind).toBe('checked');
  });

  it('hands the deadline to the model port', async () => {
    const model = createFakeModel([{ reply: { text: 'Fine.' } }]);
    const run = testRun<{ text: string }>(model, { leftMs: 9000 });
    await runGuarded(run, task());
    expect(model.requests[0]?.deadline).toBe(run.deadline);
  });
});

describe('runGuarded retry and the deadline', () => {
  it('skips the retry when a rejected reply leaves too little time, keeping its own reason', async () => {
    const clock = createFakeClock();
    const { model, requests } = slowModel([{ reply: { text: 'AQI 999.' } }], clock, 8000);
    const run = testRun<{ text: string }>(model, { clock, leftMs: 8000 + MIN_RETRY_MS - 1 });
    const result = await runGuarded(run, task());
    expect(requests).toHaveLength(1);
    expect(result).toMatchObject({ kind: 'fallback', reason: 'number_check_failed' });
    expect(result.trace.numberCheck).toEqual({ status: 'failed', attempts: 1, unmatched: ['999'] });
  });

  it('retries when enough time is left after the first reply', async () => {
    const clock = createFakeClock();
    const steps = [{ reply: { text: 'AQI 999.' } }, { reply: { text: 'Fine.' } }];
    const { model, requests } = slowModel(steps, clock, 8000);
    const run = testRun<{ text: string }>(model, { clock, leftMs: 8000 + MIN_RETRY_MS });
    expect((await runGuarded(run, task())).kind).toBe('checked');
    expect(requests).toHaveLength(2);
  });
});
