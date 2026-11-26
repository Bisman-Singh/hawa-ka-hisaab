// Tests for the route contract helpers.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineGetRoute, definePostRoute, type GetRoute, type PostRoute } from '../../src/lib/contract.js';

describe('route contracts', () => {
  it('returns a GET route unchanged', () => {
    const route: GetRoute<{ q: string }, string> = {
      method: 'GET',
      path: '/api/test',
      query: z.object({ q: z.string() }),
      response: z.string(),
      cacheSeconds: 60,
    };
    expect(defineGetRoute(route)).toBe(route);
  });

  it('returns a POST route unchanged', () => {
    const route: PostRoute<{ text: string }, string> = {
      method: 'POST',
      path: '/api/test',
      body: z.object({ text: z.string() }),
      response: z.string(),
    };
    expect(definePostRoute(route)).toBe(route);
  });
});
