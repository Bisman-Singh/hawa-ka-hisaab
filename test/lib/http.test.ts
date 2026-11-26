// Tests for upstream fetch: timeout, size bound, status and network failures, and JSON validation.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fetchJson, fetchText, type UpstreamRequest } from '../../src/lib/http.js';
import { chunkedResponse, createFakeFetcher, hangingFetcher } from '../support/fake-fetch.js';

const request: UpstreamRequest = { url: 'https://upstream.test/feed', timeoutMs: 1000, maxBytes: 16 };

const answer = (response: Response) => createFakeFetcher(() => Promise.resolve(response));

describe('fetchText', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the body text and passes headers and an abort signal', async () => {
    const fake = answer(chunkedResponse(['hello ', 'feed']));
    const result = await fetchText(fake.fetch, { ...request, headers: { accept: 'text/xml' } });
    expect(result).toEqual({ ok: true, value: 'hello feed' });
    expect(fake.calls[0]?.url).toBe(request.url);
    expect(fake.calls[0]?.init.headers).toEqual({ accept: 'text/xml' });
    expect(fake.calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('decodes a character split across chunks', async () => {
    const bytes = new TextEncoder().encode('हवा');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 4));
        controller.enqueue(bytes.slice(4));
        controller.close();
      },
    });
    expect(await fetchText(answer(new Response(body)).fetch, request)).toEqual({ ok: true, value: 'हवा' });
  });

  it('returns empty text for a response without a body', async () => {
    expect(await fetchText(answer(new Response(null, { status: 204 })).fetch, request)).toEqual({
      ok: true,
      value: '',
    });
  });

  it('reports a non-success status, with or without a body', async () => {
    const withBody = answer(new Response('busy', { status: 503 }));
    const withoutBody = answer(new Response(null, { status: 500 }));
    expect(await fetchText(withBody.fetch, request)).toEqual({
      ok: false,
      error: { kind: 'status', status: 503 },
    });
    expect(await fetchText(withoutBody.fetch, request)).toEqual({
      ok: false,
      error: { kind: 'status', status: 500 },
    });
  });

  it('refuses a body whose declared length is over the limit without reading it', async () => {
    const declared = new Response('x', { headers: { 'content-length': '17' } });
    const declaredEmpty = new Response(null, { headers: { 'content-length': '17' } });
    expect(await fetchText(answer(declared).fetch, request)).toEqual({
      ok: false,
      error: { kind: 'too_large' },
    });
    expect(await fetchText(answer(declaredEmpty).fetch, request)).toEqual({
      ok: false,
      error: { kind: 'too_large' },
    });
  });

  it('stops reading once streamed bytes pass the limit', async () => {
    const fake = answer(chunkedResponse(['0123456789', '0123456789']));
    expect(await fetchText(fake.fetch, request)).toEqual({ ok: false, error: { kind: 'too_large' } });
  });

  it('reports a network failure when fetch rejects', async () => {
    const fake = createFakeFetcher(() => Promise.reject(new TypeError('fetch failed')));
    expect(await fetchText(fake.fetch, request)).toEqual({ ok: false, error: { kind: 'network' } });
  });

  it('aborts and reports a timeout when the upstream does not answer in time', async () => {
    vi.useFakeTimers();
    const pending = fetchText(hangingFetcher(), request);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ ok: false, error: { kind: 'timeout' } });
  });
});

describe('fetchJson', () => {
  const schema = z.strictObject({ aqi: z.number() });

  it('returns the parsed value when it matches the schema', async () => {
    expect(await fetchJson(answer(chunkedResponse(['{"aqi":246}'])).fetch, request, schema)).toEqual({
      ok: true,
      value: { aqi: 246 },
    });
  });

  it('refuses JSON that does not match the schema', async () => {
    expect(await fetchJson(answer(chunkedResponse(['{"aqi":"high"}'])).fetch, request, schema)).toEqual({
      ok: false,
      error: { kind: 'invalid_body' },
    });
  });

  it('refuses a body that is not JSON', async () => {
    expect(await fetchJson(answer(chunkedResponse(['<html>'])).fetch, request, schema)).toEqual({
      ok: false,
      error: { kind: 'invalid_body' },
    });
  });

  it('passes an upstream failure through', async () => {
    const fake = answer(new Response(null, { status: 429 }));
    expect(await fetchJson(fake.fetch, request, schema)).toEqual({
      ok: false,
      error: { kind: 'status', status: 429 },
    });
  });
});
