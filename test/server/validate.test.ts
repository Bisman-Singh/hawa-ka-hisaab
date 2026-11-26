// Tests for request validation.
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { checkInput, readJsonBody, readQuery } from '../../src/server/validate.js';

const bodySchema = z.strictObject({ text: z.string().trim().min(1).max(10) });

const appFor = () =>
  new Hono()
    .get('/q', (c) => c.json(readQuery(c.req, z.object({ n: z.coerce.number().int() }))))
    .post('/b', async (c) => c.json(await readJsonBody(c.req, bodySchema)));

describe('checkInput', () => {
  it('returns the parsed value', () => {
    expect(checkInput(bodySchema, { text: ' hi ' })).toEqual({ ok: true, value: { text: 'hi' } });
  });

  it('names the field and the rule and never the value that was sent', () => {
    const result = checkInput(bodySchema, { text: 'a secret sentence' });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'invalid_request', issues: [{ path: 'text' }] },
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('does not repeat an unexpected field name, which could carry text', () => {
    const result = checkInput(bodySchema, { text: 'ok', 'my phone is 98765 43210': 1 });
    expect(result).toMatchObject({ ok: false, error: { issues: [{ message: 'Unexpected field.' }] } });
    expect(JSON.stringify(result)).not.toContain('98765');
  });

  it('masks path parts that do not look like field names', () => {
    const result = checkInput(z.record(z.string(), z.number()), { 'lives at 12 Park Road': 'x', count: 'y' });
    const paths = result.ok ? [] : result.error.issues.map((issue) => issue.path);
    expect(paths).toEqual(['*', 'count']);
  });

  it('names array positions by index', () => {
    const result = checkInput(z.strictObject({ items: z.array(z.number()) }), { items: [1, 'two'] });
    expect(result).toMatchObject({ ok: false, error: { issues: [{ path: 'items.1' }] } });
  });

  it('marks issues about the whole value as (root)', () => {
    expect(checkInput(bodySchema, 'text')).toMatchObject({
      ok: false,
      error: { issues: [{ path: '(root)' }] },
    });
  });

  it('reports at most 20 issues', () => {
    const many = z.strictObject(
      Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`f${String(i)}`, z.string()])),
    );
    const result = checkInput(many, {});
    expect(result.ok ? 0 : result.error.issues.length).toBe(20);
  });
});

describe('readQuery', () => {
  it('checks the query string with the schema', async () => {
    const app = appFor();
    expect(await (await app.request('/q?n=4')).json()).toEqual({ ok: true, value: { n: 4 } });
    expect(await (await app.request('/q?n=four')).json()).toMatchObject({
      ok: false,
      error: { code: 'invalid_request' },
    });
  });
});

describe('readJsonBody', () => {
  const post = (body: string, type: string | null) =>
    appFor().request('/b', { method: 'POST', body, headers: type ? { 'content-type': type } : {} });

  it('accepts a JSON body with or without a charset', async () => {
    expect(await (await post('{"text":"hi"}', 'application/json')).json()).toEqual({
      ok: true,
      value: { text: 'hi' },
    });
    expect(await (await post('{"text":"hi"}', 'application/json; charset=utf-8')).json()).toMatchObject({
      ok: true,
    });
  });

  it('refuses other content types, including the ones a cross-site form can send', async () => {
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/jsonp', null]) {
      expect(await (await post('{"text":"hi"}', type)).json()).toMatchObject({
        ok: false,
        error: { code: 'unsupported_media_type' },
      });
    }
  });

  it('refuses a body sent with no content type at all', async () => {
    const body = new TextEncoder().encode('{"text":"hi"}');
    const response = await appFor().request('/b', { method: 'POST', body });
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'unsupported_media_type' } });
  });

  it('refuses a body that is not JSON', async () => {
    expect(await (await post('{text', 'application/json')).json()).toMatchObject({
      ok: false,
      error: { code: 'invalid_request', message: 'The body is not valid JSON.' },
    });
  });
});
