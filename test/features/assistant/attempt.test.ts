// Tests for one attempt: a model failure, a schema miss with or without raw text, a check failure and a pass.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { attempt, type GuardedTask } from '../../../src/features/assistant/attempt.js';
import { createFakeModel } from '../../support/fake-model.js';

const schema = z.strictObject({ text: z.string() });
const task: GuardedTask<{ text: string }> = {
  request: {
    task: 'ask',
    instructions: 'Answer.',
    data: '{}',
    facts: [{ id: 'f', label: 'f', value: 7, unit: '' }],
    schema,
    tools: [],
  },
  sources: () => ['18:00'],
  prose: (reply) => [reply.text],
  check: (reply) => (reply.text.includes('dose') ? 'medicine' : null),
};

describe('attempt', () => {
  it('passes a reply whose numbers come from the facts and the sources', async () => {
    const model = createFakeModel([{ reply: { text: 'Go at 18:00, 7 minutes early.' } }]);
    expect((await attempt(model, task, task.request)).kind).toBe('checked');
  });

  it('reports a model failure as failed with its kind', async () => {
    const model = createFakeModel([{ failure: 'timeout' }]);
    expect(await attempt(model, task, task.request)).toEqual({ kind: 'failed', failure: 'timeout' });
  });

  it('keeps the raw text of a schema miss when the port has it, and none when it does not', async () => {
    const written = await attempt(createFakeModel([{ reply: { other: 1 } }], 'm'), task, task.request);
    expect(written).toEqual({
      kind: 'rejected',
      problem: 'schema',
      reply: { rawText: '{"other":1}', modelId: 'm', toolCalls: [] },
      numbers: null,
    });
    const bare = await attempt(createFakeModel([{ failure: 'invalid_reply' }]), task, task.request);
    expect(bare).toMatchObject({ kind: 'rejected', problem: 'schema', reply: null });
  });

  it('names the first check that failed: prose, then the task rule, then numbers', async () => {
    const run = (text: string) => attempt(createFakeModel([{ reply: { text } }]), task, task.request);
    expect(await run('<b>8</b>')).toMatchObject({ problem: 'markup' });
    expect(await run('A dose of 8.')).toMatchObject({ problem: 'medicine' });
    expect(await run('About 8.')).toMatchObject({ problem: 'numbers', numbers: { unmatched: ['8'] } });
  });
});
