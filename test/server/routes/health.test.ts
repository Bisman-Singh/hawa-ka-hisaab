// Tests for GET /api/health through the whole app.
import { describe, expect, it } from 'vitest';
import { API_HEADERS } from '../../../src/config/headers.js';
import { healthResponseSchema } from '../../../src/lib/health.js';
import { createApp } from '../../../src/server/app.js';
import { createTestDeps } from '../../support/test-deps.js';

describe('GET /api/health', () => {
  it('answers ok with the server clock, uncached and with security headers', async () => {
    const test = createTestDeps();
    const response = await createApp(test.deps).request('/api/health');
    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'ok',
      time: new Date(test.clock.now()).toISOString(),
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-security-policy')).toBe(API_HEADERS[0]?.value);
  });
});
