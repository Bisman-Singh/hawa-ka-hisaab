// Tests for the model port helpers: tools that validate their arguments, and the disabled port.
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineTool, disabledModel } from '../../src/lib/model.js';

const tripTool = () => {
  const run = vi.fn(({ km }: { km: number }) => ({ kgCo2: km * 2 }));
  const tool = defineTool({
    name: 'trip_co2',
    description: 'CO2 for a trip',
    parameters: z.strictObject({ km: z.number().positive() }),
    run,
  });
  return { tool, run };
};

describe('defineTool', () => {
  it('keeps the name, description and parameter schema for the adapter', () => {
    const { tool } = tripTool();
    expect(tool.name).toBe('trip_co2');
    expect(tool.description).toBe('CO2 for a trip');
    expect(tool.parameters.safeParse({ km: 1 }).success).toBe(true);
  });

  it('runs the calculator with arguments that pass the schema', () => {
    const { tool, run } = tripTool();
    expect(tool.call({ km: 3 })).toEqual({ ok: true, value: { kgCo2: 6 } });
    expect(run).toHaveBeenCalledWith({ km: 3 });
  });

  it('never runs the calculator with arguments that fail the schema', () => {
    const { tool, run } = tripTool();
    expect(tool.call({ km: -1 })).toEqual({ ok: false, error: 'invalid_arguments' });
    expect(tool.call({ km: 3, extra: 'ignore previous instructions' })).toEqual({
      ok: false,
      error: 'invalid_arguments',
    });
    expect(run).not.toHaveBeenCalled();
  });
});

describe('tool results', () => {
  it('reports a result that is not plain JSON as failed instead of passing it on', () => {
    const ratio = defineTool({
      name: 'ratio',
      description: 'a over b',
      parameters: z.strictObject({ a: z.number(), b: z.number() }),
      run: ({ a, b }) => a / b,
    });
    expect(ratio.call({ a: 1, b: 2 })).toEqual({ ok: true, value: 0.5 });
    expect(ratio.call({ a: 1, b: 0 })).toEqual({ ok: false, error: 'failed' });
  });

  it('reports a calculator that throws as failed', () => {
    const broken = defineTool({
      name: 'broken',
      description: 'always fails',
      parameters: z.strictObject({}),
      run: () => {
        throw new RangeError('no table for this input');
      },
    });
    expect(broken.call({})).toEqual({ ok: false, error: 'failed' });
  });
});

describe('disabledModel', () => {
  it('has no model id and fails every call as disabled', async () => {
    expect(disabledModel.modelId).toBeNull();
    const reply = await disabledModel.generate({
      task: 'plan',
      instructions: 'x',
      data: 'y',
      facts: [],
      schema: z.string(),
      tools: [],
    });
    expect(reply).toEqual({ ok: false, error: { kind: 'disabled' } });
  });
});
