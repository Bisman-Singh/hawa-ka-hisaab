// Tests for the health route contract.
import { describe, expect, it } from 'vitest';
import { healthResponseSchema, healthRoute } from '../../src/lib/health.js';

describe('healthRoute', () => {
  it('is an uncached GET at /api/health', () => {
    expect(healthRoute).toMatchObject({
      method: 'GET',
      path: '/api/health',
      cacheSeconds: 0,
    });
  });

  it('ignores query parameters such as cache busters', () => {
    expect(healthRoute.query.parse({ t: '123' })).toEqual({});
  });

  it('accepts only status ok with an ISO time', () => {
    expect(healthResponseSchema.safeParse({ status: 'ok', time: '2026-11-24T16:30:00.000Z' }).success).toBe(
      true,
    );
    expect(healthResponseSchema.safeParse({ status: 'down', time: '2026-11-24T16:30:00.000Z' }).success).toBe(
      false,
    );
    expect(healthResponseSchema.safeParse({ status: 'ok', time: 'yesterday' }).success).toBe(false);
  });
});
