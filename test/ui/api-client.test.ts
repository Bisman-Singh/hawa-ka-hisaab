// Tests for the typed API client: input checks, response checks and every failure kind.
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineGetRoute, definePostRoute } from '../../src/lib/contract.js';
import { getJson, postJson } from '../../src/ui/api-client.js';
import { createFakeFetcher } from '../support/fake-fetch.js';

const getRoute = defineGetRoute({
  method: 'GET',
  path: '/api/air',
  query: z.object({ lat: z.coerce.number().min(6), lon: z.coerce.number() }),
  response: z.strictObject({ aqi: z.number() }),
  cacheSeconds: 300,
});

const emptyRoute = defineGetRoute({ ...getRoute, path: '/api/health', query: z.object({}) });

const postRoute = definePostRoute({
  method: 'POST',
  path: '/api/intake',
  body: z.strictObject({ text: z.string().min(1) }),
  response: z.strictObject({ ok: z.boolean() }),
});

const json = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
};

const answering = (response: Response) => createFakeFetcher(() => Promise.resolve(response));

describe('getJson', () => {
  it('sends the query as strings and returns the checked body', async () => {
    const fake = answering(json({ aqi: 246 }));
    expect(await getJson(getRoute, { lat: 28.54, lon: 77.17 }, { fetcher: fake.fetch })).toEqual({
      ok: true,
      value: { aqi: 246 },
    });
    expect(fake.calls[0]?.url).toBe('/api/air?lat=28.54&lon=77.17');
    expect(fake.calls[0]?.init).toMatchObject({ method: 'GET', credentials: 'same-origin', signal: null });
  });

  it('leaves the question mark off when there is no query', async () => {
    const fake = answering(json({ aqi: 1 }));
    await getJson(emptyRoute, {}, { fetcher: fake.fetch });
    expect(fake.calls[0]?.url).toBe('/api/health');
  });

  it('refuses a query the server would refuse, without calling the network', async () => {
    const fake = answering(json({ aqi: 1 }));
    expect(await getJson(getRoute, { lat: 1, lon: 77 }, { fetcher: fake.fetch })).toEqual({
      ok: false,
      error: { kind: 'invalid_input' },
    });
    expect(fake.calls).toHaveLength(0);
  });

  it('refuses a success body that breaks the contract', async () => {
    const fake = answering(json({ aqi: 'high' }));
    expect(await getJson(getRoute, { lat: 28, lon: 77 }, { fetcher: fake.fetch })).toEqual({
      ok: false,
      error: { kind: 'invalid_response', status: 200 },
    });
  });

  it('reads the API error code and the retry wait', async () => {
    const body = { error: { code: 'rate_limited', message: 'Too many requests.', issues: [] } };
    const fake = answering(json(body, { status: 429, headers: { 'retry-after': '42' } }));
    expect(await getJson(getRoute, { lat: 28, lon: 77 }, { fetcher: fake.fetch })).toEqual({
      ok: false,
      error: { kind: 'api', status: 429, code: 'rate_limited', retryAfterSeconds: 42 },
    });
  });

  it('reports an API error without a retry wait as null', async () => {
    const body = { error: { code: 'internal', message: 'x', issues: [] } };
    const fake = answering(json(body, { status: 500 }));
    expect(await getJson(getRoute, { lat: 28, lon: 77 }, { fetcher: fake.fetch })).toMatchObject({
      error: { kind: 'api', retryAfterSeconds: null },
    });
  });

  it('reports an error status without the API body, such as a proxy page', async () => {
    const fake = answering(new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await getJson(getRoute, { lat: 28, lon: 77 }, { fetcher: fake.fetch })).toEqual({
      ok: false,
      error: { kind: 'http', status: 502 },
    });
  });

  it('reports a network failure, which is how being offline shows up', async () => {
    const fake = createFakeFetcher(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await getJson(getRoute, { lat: 28, lon: 77 }, { fetcher: fake.fetch })).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });

  it('reports an aborted call as aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fake = createFakeFetcher(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    const result = await getJson(
      getRoute,
      { lat: 28, lon: 77 },
      { fetcher: fake.fetch, signal: controller.signal },
    );
    expect(result).toEqual({ ok: false, error: { kind: 'aborted' } });
    expect(fake.calls[0]?.init.signal).toBe(controller.signal);
  });

  it('reports an abort while the body is being read as aborted, not as a bad response', async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      pull(stream) {
        controller.abort();
        stream.error(new DOMException('aborted', 'AbortError'));
      },
    });
    const fake = answering(new Response(body, { status: 200 }));
    const result = await getJson(
      getRoute,
      { lat: 28, lon: 77 },
      { fetcher: fake.fetch, signal: controller.signal },
    );
    expect(result).toEqual({ ok: false, error: { kind: 'aborted' } });
  });

  it('uses the browser fetch when no fetcher is given', async () => {
    const browserFetch = vi.fn(() => Promise.resolve(json({ aqi: 5 })));
    vi.stubGlobal('fetch', browserFetch);
    expect(await getJson(getRoute, { lat: 28, lon: 77 })).toEqual({ ok: true, value: { aqi: 5 } });
    expect(browserFetch).toHaveBeenCalledTimes(1);
  });
});

describe('postJson', () => {
  it('sends the body as JSON and returns the checked answer', async () => {
    const fake = answering(json({ ok: true }));
    expect(await postJson(postRoute, { text: 'two adults' }, { fetcher: fake.fetch })).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect(fake.calls[0]?.init).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"text":"two adults"}',
    });
  });

  it('refuses a body the server would refuse, without calling the network', async () => {
    const fake = answering(json({ ok: true }));
    expect(await postJson(postRoute, { text: '' }, { fetcher: fake.fetch })).toEqual({
      ok: false,
      error: { kind: 'invalid_input' },
    });
    expect(fake.calls).toHaveLength(0);
  });

  it('uses the browser fetch when no fetcher is given', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(json({ ok: false }))),
    );
    expect(await postJson(postRoute, { text: 'x' })).toEqual({ ok: true, value: { ok: false } });
  });
});
