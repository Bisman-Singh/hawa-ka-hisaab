// Tests for building the runtime dependencies from the environment.
import { describe, expect, it, vi } from 'vitest';
import { createRuntimeDeps } from '../../src/server/runtime.js';

describe('createRuntimeDeps', () => {
  it('builds working dependencies from an empty environment', async () => {
    const deps = createRuntimeDeps({});
    expect(Math.abs(deps.clock.now() - Date.now())).toBeLessThan(1000);
    expect(await deps.requestLimiter.take('a')).toEqual({ allowed: true, remaining: 59 });
    expect(await deps.modelLimiter.take('a')).toEqual({ allowed: true, remaining: 5 });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    deps.logger.info('started');
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('applies the configured limits', async () => {
    const deps = createRuntimeDeps({ API_RATE_LIMIT_PER_MINUTE: '1', MODEL_RATE_LIMIT_PER_MINUTE: '0' });
    await deps.requestLimiter.take('a');
    expect(await deps.requestLimiter.take('a')).toMatchObject({ allowed: false });
    expect(await deps.modelLimiter.take('a')).toMatchObject({ allowed: false });
  });

  it('builds the disabled model with no key and the measured order with one', () => {
    expect(createRuntimeDeps({}).model.modelId).toBeNull();
    expect(createRuntimeDeps({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-a,gemini-b' }).model.modelId).toBe(
      'gemini-a',
    );
    expect(() => createRuntimeDeps({ GEMINI_MODEL: 'not a model' })).toThrow('GEMINI_MODEL');
  });

  it('stops startup on a bad variable, naming it without its value', () => {
    expect(() => createRuntimeDeps({ MODEL_RATE_LIMIT_PER_MINUTE: 'many' })).toThrow(
      'Invalid environment variables: MODEL_RATE_LIMIT_PER_MINUTE',
    );
    expect(() => createRuntimeDeps({ MODEL_RATE_LIMIT_PER_MINUTE: 'many' })).not.toThrow(/many/);
  });
});
