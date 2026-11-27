// Tests for GET /api/health through the whole app.
import { describe, expect, it } from 'vitest';
import { API_HEADERS } from '../../../src/config/headers.js';
import { healthResponseSchema } from '../../../src/lib/health.js';
import { createApp } from '../../../src/server/app.js';
import { createFakeAirSources } from '../../support/fake-air-sources.js';
import { createFakeModel } from '../../support/fake-model.js';
import { createTestDeps } from '../../support/test-deps.js';

describe('GET /api/health', () => {
  it('answers ok with the server clock, uncached and with security headers', async () => {
    const test = createTestDeps();
    const response = await createApp(test.deps).request('/api/health');
    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'ok',
      time: new Date(test.clock.now()).toISOString(),
      sources: { cpcbFeed: false, dataGovIn: false, model: false },
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toBe(API_HEADERS[0]?.value);
  });

  it('says which sources this instance is set up with, and nothing about their keys', async () => {
    const air = createFakeAirSources({ stationProviders: ['data_gov_in'] });
    const test = createTestDeps({
      air,
      model: createFakeModel([{ failure: 'quota' }], 'test-model'),
    });
    const text = await (await createApp(test.deps).request('/api/health')).text();
    expect(JSON.parse(text)).toMatchObject({ sources: { cpcbFeed: false, dataGovIn: true, model: true } });
    expect(text).not.toMatch(/key|test-model/i);
  });
});
