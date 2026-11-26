// Tests for the API middleware.
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { API_HEADERS } from '../../src/config/headers.js';
import { MAX_BODY_BYTES } from '../../src/config/limits.js';
import {
  catchThrown,
  limitBody,
  requestLog,
  sameOriginOnly,
  securityHeaders,
} from '../../src/server/middleware.js';
import { chunkedResponse } from '../support/fake-fetch.js';
import { createTestDeps } from '../support/test-deps.js';

describe('securityHeaders', () => {
  const app = new Hono();
  app.use('*', securityHeaders);
  app.get('/ok', (c) => c.text('fine'));
  app.get('/boom', () => {
    throw new Error('boom');
  });
  app.onError((_error, c) => c.text('failed', 500));

  it('sets every API header on success and on error responses', async () => {
    for (const path of ['/ok', '/boom', '/missing']) {
      const response = await app.request(path);
      for (const header of API_HEADERS) {
        expect(response.headers.get(header.key)).toBe(header.value);
      }
    }
  });
});

describe('sameOriginOnly', () => {
  const app = new Hono();
  app.use('*', sameOriginOnly);
  app.get('/x', (c) => c.text('fine'));

  it('refuses requests a browser marks as cross-site or same-site', async () => {
    for (const site of ['cross-site', 'same-site']) {
      const response = await app.request('/x', { headers: { 'sec-fetch-site': site } });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'forbidden_origin' } });
    }
  });

  it('lets same-origin, direct and header-less requests through', async () => {
    for (const headers of [{ 'sec-fetch-site': 'same-origin' }, { 'sec-fetch-site': 'none' }, {}]) {
      expect((await app.request('/x', { headers })).status).toBe(200);
    }
  });
});

describe('limitBody', () => {
  const app = new Hono();
  app.use('*', limitBody);
  app.post('/x', async (c) => c.text(String((await c.req.text()).length)));

  it('accepts a body at the limit', async () => {
    const response = await app.request('/x', { method: 'POST', body: 'x'.repeat(MAX_BODY_BYTES) });
    expect(await response.text()).toBe(String(MAX_BODY_BYTES));
  });

  it('refuses a larger body that declares its length', async () => {
    const response = await app.request('/x', { method: 'POST', body: 'x'.repeat(MAX_BODY_BYTES + 1) });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { code: 'payload_too_large' } });
  });

  it('refuses a larger body that is streamed without a length', async () => {
    const stream = chunkedResponse(['x'.repeat(MAX_BODY_BYTES), 'x']).body;
    const init: RequestInit & { duplex: 'half' } = { method: 'POST', body: stream, duplex: 'half' };
    const response = await app.request('/x', init);
    expect(response.status).toBe(413);
  });
});

describe('catchThrown', () => {
  it('answers a thrown value that is not an Error with a plain 500 and logs no part of it', async () => {
    const test = createTestDeps();
    const app = new Hono();
    app.use('*', catchThrown(test.deps));
    app.get('/x', () => {
      const thrown: unknown = { note: 'a household description' };
      throw thrown;
    });
    const response = await app.request('/x');
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: 'internal' } });
    expect(test.logText()).toContain('"errorName":"non_error"');
    expect(test.logText()).not.toContain('household');
  });

  it('leaves normal responses alone', async () => {
    const app = new Hono();
    app.use('*', catchThrown(createTestDeps().deps));
    app.get('/x', (c) => c.text('fine'));
    expect(await (await app.request('/x')).text()).toBe('fine');
  });
});

describe('requestLog', () => {
  it('logs the route pattern, method, status and duration, never the path itself', async () => {
    const test = createTestDeps();
    const app = new Hono();
    app.use('*', requestLog(test.deps));
    app.get('/items/:id', (c) => {
      test.clock.advance(7);
      return c.text('ok');
    });
    await app.request('/items/my-private-note');
    expect(test.logText()).not.toContain('my-private-note');
    expect(JSON.parse(test.logLines[0]?.line ?? '')).toMatchObject({
      event: 'request',
      route: '/items/:id',
      method: 'GET',
      status: 200,
      durationMs: 7,
    });
  });
});
