// Tests for mounting routes from contracts.
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineGetRoute, definePostRoute } from '../../src/lib/contract.js';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { err, ok } from '../../src/lib/result.js';
import { failure } from '../../src/server/errors.js';
import { asClient, createUpstreamBudget } from '../../src/server/air/budget.js';
import { mountGet, mountPost, type RouteHandler } from '../../src/server/mount.js';
import { createFakeClock } from '../support/fake-clock.js';
import { createTestDeps } from '../support/test-deps.js';

const getRoute = (cacheSeconds: number) =>
  defineGetRoute({
    method: 'GET',
    path: '/api/double',
    query: z.object({ n: z.coerce.number().int() }),
    response: z.strictObject({ doubled: z.number() }),
    cacheSeconds,
  });

const postRoute = definePostRoute({
  method: 'POST',
  path: '/api/echo',
  body: z.strictObject({ text: z.string().trim().min(1) }),
  response: z.strictObject({ text: z.string() }),
});

const limiterOf = (limit: number) =>
  createFixedWindowLimiter({ limit, windowMs: 60_000, maxKeys: 10, clock: createFakeClock() });

function getApp(handle: RouteHandler<{ n: number }, { doubled: number }>, cacheSeconds = 60, limit = 100) {
  const test = createTestDeps({ requestLimiter: limiterOf(limit) });
  const app = new Hono();
  mountGet({ app, deps: test.deps }, getRoute(cacheSeconds), handle);
  return { app, test };
}

const doubles: RouteHandler<{ n: number }, { doubled: number }> = (input) =>
  Promise.resolve(ok({ doubled: input.n * 2 }));

describe('mountGet', () => {
  it('answers with the checked body and a cache header the browser and the CDN both keep', async () => {
    const response = await getApp(doubles).app.request('/api/double?n=4');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(await response.json()).toEqual({ doubled: 8 });
  });

  it('lets a route set the cache time of each answer, so a degraded one is never kept', async () => {
    const test = createTestDeps();
    const app = new Hono();
    const route = { ...getRoute(300), cacheFor: (body: { doubled: number }) => (body.doubled > 4 ? 0 : 300) };
    mountGet({ app, deps: test.deps }, route, doubles);
    expect((await app.request('/api/double?n=3')).headers.get('cache-control')).toBe('no-store');
    expect((await app.request('/api/double?n=1')).headers.get('cache-control')).toBe(
      'public, max-age=300, s-maxage=300',
    );
  });

  it('marks uncached routes no-store', async () => {
    const response = await getApp(doubles, 0).app.request('/api/double?n=1');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('refuses a bad query before the handler runs', async () => {
    const handle = vi.fn(doubles);
    const response = await getApp(handle).app.request('/api/double?n=x');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_request', issues: [{ path: 'n' }] },
    });
    expect(handle).not.toHaveBeenCalled();
  });

  it('sends a returned failure with its status', async () => {
    const { app } = getApp(() => Promise.resolve(err(failure('upstream_unavailable'))));
    const response = await app.request('/api/double?n=1');
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('refuses to send a body that breaks its own contract, and logs it', async () => {
    const { app, test } = getApp(() => Promise.resolve(ok({ doubled: Number.NaN })));
    const response = await app.request('/api/double?n=1');
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: 'internal' } });
    expect(test.logText()).toContain('"event":"response_invalid"');
  });

  it('applies the request limit per client and says when to retry', async () => {
    const handle = vi.fn(doubles);
    const { app } = getApp(handle, 60, 1);
    const first = { headers: { 'x-real-ip': '203.0.113.1' } };
    expect((await app.request('/api/double?n=1', first)).status).toBe(200);
    const limited = await app.request('/api/double?n=1', first);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(await limited.json()).toMatchObject({ error: { code: 'rate_limited' } });
    expect((await app.request('/api/double?n=1', { headers: { 'x-real-ip': '203.0.113.2' } })).status).toBe(
      200,
    );
    expect((await app.request('/api/double?n=1')).status).toBe(200);
    expect((await app.request('/api/double?n=1')).status).toBe(429);
    expect(handle).toHaveBeenCalledTimes(3);
  });

  it('tells the handler the client key, for the per-client model limit', async () => {
    const handle = vi.fn(doubles);
    const { app } = getApp(handle);
    await app.request('/api/double?n=2', { headers: { 'x-real-ip': '198.51.100.7' } });
    await app.request('/api/double?n=2');
    expect(handle.mock.calls.map((call) => call[1])).toEqual([
      { clientKey: '198.51.100.7' },
      { clientKey: 'unknown' },
    ]);
  });

  it('keys IPv6 clients by their /64 network, so changing the last half of the address gives no new bucket', async () => {
    const { app } = getApp(doubles, 60, 1);
    const from = (address: string) => ({ headers: { 'x-real-ip': address } });
    expect((await app.request('/api/double?n=1', from('2401:4900:1c2a:7f00::1'))).status).toBe(200);
    expect((await app.request('/api/double?n=1', from('2401:4900:1c2a:7f00:dead:beef:0:2'))).status).toBe(
      429,
    );
    expect((await app.request('/api/double?n=1', from('2401:4900:1c2a:7f01::1'))).status).toBe(200);
  });

  it('uses the connection address on the local Node servers, where no proxy sets a header', async () => {
    const handle = vi.fn(doubles);
    const { app } = getApp(handle);
    const local = (address: string) => ({ incoming: { socket: { remoteAddress: address } } });
    await app.request('/api/double?n=2', {}, local('::ffff:127.0.0.1'));
    await app.request('/api/double?n=2', { headers: { 'x-real-ip': 'not an address' } }, local('192.0.2.5'));
    await app.request('/api/double?n=2', {}, { incoming: {} });
    expect(handle.mock.calls.map((call) => call[1].clientKey)).toEqual(['127.0.0.1', '192.0.2.5', 'unknown']);
  });

  it('runs the handler with its client in scope, so upstream calls it causes are charged to that client', async () => {
    const budget = createUpstreamBudget(
      { perClientPerMinute: 1, perMinute: 10, perDay: 10 },
      createFakeClock(),
    );
    const { app } = getApp(async (input) => ok({ doubled: (await budget.allow()) ? input.n : -1 }));
    const ask = async (address: string): Promise<unknown> => {
      const response = await app.request('/api/double?n=5', { headers: { 'x-real-ip': address } });
      const body: unknown = await response.json();
      return body;
    };
    expect(await ask('203.0.113.1')).toEqual({ doubled: 5 });
    expect(await ask('203.0.113.1')).toEqual({ doubled: -1 });
    expect(await ask('203.0.113.2')).toEqual({ doubled: 5 });
    expect(await asClient('203.0.113.2', () => budget.allow())).toBe(false);
  });
});

describe('mountPost', () => {
  const postApp = (limit = 100) => {
    const test = createTestDeps({ requestLimiter: limiterOf(limit) });
    const app = new Hono();
    const handle = vi.fn((input: { text: string }) => Promise.resolve(ok({ text: input.text })));
    mountPost({ app, deps: test.deps }, postRoute, handle);
    return { app, handle };
  };

  const send = (app: Hono, body: string) =>
    app.request('/api/echo', { method: 'POST', body, headers: { 'content-type': 'application/json' } });

  it('passes the parsed body to the handler and never caches the answer', async () => {
    const { app, handle } = postApp();
    const response = await send(app, JSON.stringify({ text: '  hi  ' }));
    expect(await response.json()).toEqual({ text: 'hi' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(handle).toHaveBeenCalledWith({ text: 'hi' }, { clientKey: 'unknown' });
  });

  it('refuses a body that is not JSON content', async () => {
    const { app, handle } = postApp();
    const response = await app.request('/api/echo', { method: 'POST', body: 'text=hi' });
    expect(response.status).toBe(415);
    expect(handle).not.toHaveBeenCalled();
  });

  it('applies the request limit before reading the body', async () => {
    const { app, handle } = postApp(0);
    expect((await send(app, '{"text":"a"}')).status).toBe(429);
    expect(handle).not.toHaveBeenCalled();
  });
});
