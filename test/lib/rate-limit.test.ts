// Tests for the fixed-window rate limiter.
import { describe, expect, it } from 'vitest';
import { createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
import { createFakeClock } from '../support/fake-clock.js';

function setup(maxKeys = 10) {
  const clock = createFakeClock(0);
  const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 60_000, maxKeys, clock });
  return { clock, limiter };
}

describe('createFixedWindowLimiter', () => {
  it('allows up to the limit in a window, then refuses with a wait in seconds', async () => {
    const { clock, limiter } = setup();
    expect(await limiter.take('a')).toEqual({ allowed: true, remaining: 1 });
    expect(await limiter.take('a')).toEqual({ allowed: true, remaining: 0 });
    clock.advance(15_500);
    expect(await limiter.take('a')).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it('never asks for a wait shorter than one second', async () => {
    const { clock, limiter } = setup();
    await limiter.take('a');
    await limiter.take('a');
    clock.advance(59_999);
    expect(await limiter.take('a')).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('starts a new window once the old one ends', async () => {
    const { clock, limiter } = setup();
    await limiter.take('a');
    await limiter.take('a');
    clock.advance(60_000);
    expect(await limiter.take('a')).toEqual({ allowed: true, remaining: 1 });
  });

  it('counts each key on its own', async () => {
    const { limiter } = setup();
    await limiter.take('a');
    await limiter.take('a');
    expect(await limiter.take('b')).toEqual({ allowed: true, remaining: 1 });
  });

  it('drops ended windows first when it is full', async () => {
    const { clock, limiter } = setup(2);
    await limiter.take('a');
    await limiter.take('a');
    clock.advance(30_000);
    await limiter.take('b');
    clock.advance(30_000);
    await limiter.take('c');
    await limiter.take('b');
    expect(await limiter.take('b')).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it('drops the oldest live window when it is full of live windows', async () => {
    const { limiter } = setup(2);
    await limiter.take('a');
    await limiter.take('a');
    await limiter.take('b');
    await limiter.take('c');
    expect(await limiter.take('a')).toEqual({ allowed: true, remaining: 1 });
  });
});
