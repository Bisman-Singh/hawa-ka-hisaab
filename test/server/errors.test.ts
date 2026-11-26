// Tests for error responses.
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { apiErrorBodySchema, apiErrorCodeSchema } from '../../src/lib/api-error.js';
import { API_ERROR_STATUS, failure, sendFailure } from '../../src/server/errors.js';

describe('sendFailure', () => {
  it('sends the standard body with the status for each code and never caches it', async () => {
    for (const code of apiErrorCodeSchema.options) {
      const app = new Hono().get('/x', (c) => sendFailure(c, failure(code)));
      const response = await app.request('/x');
      expect(response.status).toBe(API_ERROR_STATUS[code]);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = apiErrorBodySchema.parse(await response.json());
      expect(body.error).toMatchObject({ code, issues: [] });
      expect(body.error.message.length).toBeGreaterThan(0);
    }
  });
});

describe('sendFailure limits', () => {
  it('cuts text and issues to what the error schema allows, so the client can read the code', async () => {
    const issues = Array.from({ length: 25 }, () => ({ path: 'p'.repeat(300), message: 'm'.repeat(300) }));
    const app = new Hono().get('/x', (c) =>
      sendFailure(c, { code: 'invalid_request', message: 'x'.repeat(500), issues }),
    );
    const body = apiErrorBodySchema.parse(await (await app.request('/x')).json());
    expect(body.error.issues).toHaveLength(20);
    expect(body.error.message).toHaveLength(200);
  });
});

describe('failure', () => {
  it('uses a plain message that names no internals', () => {
    expect(failure('internal').message).toBe('Something went wrong on our side. Try again shortly.');
  });
});
