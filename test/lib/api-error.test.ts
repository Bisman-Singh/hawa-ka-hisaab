// Tests for the API error body schema.
import { describe, expect, it } from 'vitest';
import { apiErrorBodySchema, apiErrorCodeSchema } from '../../src/lib/api-error.js';

describe('apiErrorBodySchema', () => {
  it('accepts a body with a known code and issues', () => {
    const body = {
      error: { code: 'invalid_request', message: 'Bad.', issues: [{ path: 'q', message: 'Too short' }] },
    };
    expect(apiErrorBodySchema.parse(body)).toEqual(body);
  });

  it('refuses an unknown code, extra keys and too many issues', () => {
    const base = { code: 'internal', message: 'x', issues: [] };
    expect(apiErrorBodySchema.safeParse({ error: { ...base, code: 'teapot' } }).success).toBe(false);
    expect(apiErrorBodySchema.safeParse({ error: { ...base, stack: 'at line 1' } }).success).toBe(false);
    const issues = Array.from({ length: 21 }, () => ({ path: 'a', message: 'b' }));
    expect(apiErrorBodySchema.safeParse({ error: { ...base, issues } }).success).toBe(false);
  });

  it('lists every code the server can send', () => {
    expect(apiErrorCodeSchema.options).toEqual([
      'invalid_request',
      'unsupported_media_type',
      'payload_too_large',
      'forbidden_origin',
      'not_found',
      'rate_limited',
      'upstream_unavailable',
      'internal',
    ]);
  });
});
