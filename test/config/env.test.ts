// Tests for reading the server environment.
import { describe, expect, it } from 'vitest';
import { readServerEnv } from '../../src/config/env.js';

describe('readServerEnv', () => {
  it('uses defaults and the rules path when nothing is set', () => {
    expect(readServerEnv({})).toEqual({
      ok: true,
      value: {
        geminiApiKey: null,
        geminiModel: null,
        dataGovInApiKey: null,
        modelDailyCallCap: 200,
        apiRateLimitPerMinute: 60,
        modelRateLimitPerMinute: 6,
      },
    });
  });

  it('treats empty values as unset, as in the example file', () => {
    const result = readServerEnv({
      GEMINI_API_KEY: '',
      MODEL_DAILY_CALL_CAP: '',
      GEMINI_MODEL: '  ',
      DATA_GOV_IN_API_KEY: '',
    });
    expect(result).toMatchObject({
      ok: true,
      value: { geminiApiKey: null, modelDailyCallCap: 200, dataGovInApiKey: null },
    });
  });

  it('reads set values and ignores unrelated variables', () => {
    const result = readServerEnv({
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'test-model',
      DATA_GOV_IN_API_KEY: 'test-data-key',
      MODEL_DAILY_CALL_CAP: '50',
      API_RATE_LIMIT_PER_MINUTE: '30',
      MODEL_RATE_LIMIT_PER_MINUTE: '3',
      PATH: '/bin',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        geminiApiKey: 'test-key',
        geminiModel: 'test-model',
        dataGovInApiKey: 'test-data-key',
        modelDailyCallCap: 50,
        apiRateLimitPerMinute: 30,
        modelRateLimitPerMinute: 3,
      },
    });
  });

  it('refuses a request limit of 0, which would block every request, and allows 0 to turn model calls off', () => {
    expect(readServerEnv({ API_RATE_LIMIT_PER_MINUTE: '0' })).toEqual({
      ok: false,
      error: ['API_RATE_LIMIT_PER_MINUTE'],
    });
    expect(readServerEnv({ MODEL_RATE_LIMIT_PER_MINUTE: '0', MODEL_DAILY_CALL_CAP: '0' })).toMatchObject({
      ok: true,
      value: { modelRateLimitPerMinute: 0, modelDailyCallCap: 0 },
    });
  });

  it('names bad variables without echoing their values', () => {
    const result = readServerEnv({ MODEL_DAILY_CALL_CAP: 'lots', API_RATE_LIMIT_PER_MINUTE: '-1' });
    expect(result).toEqual({ ok: false, error: ['MODEL_DAILY_CALL_CAP', 'API_RATE_LIMIT_PER_MINUTE'] });
    expect(JSON.stringify(result)).not.toContain('lots');
  });
});
