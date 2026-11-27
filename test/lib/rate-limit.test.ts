// Tests for the fixed-window rate limiter and the client address key.
import { describe, expect, it } from 'vitest';
import { addressKey, createFixedWindowLimiter } from '../../src/lib/rate-limit.js';
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

  it('drops the oldest live window that is not blocked when it is full of live windows', async () => {
    const { limiter } = setup(2);
    await limiter.take('a');
    await limiter.take('b');
    await limiter.take('c');
    expect(await limiter.take('a')).toEqual({ allowed: true, remaining: 1 });
  });

  it('never forgives a blocked client when a flood of new keys fills it', async () => {
    const { clock, limiter } = setup(100);
    await limiter.take('victim');
    await limiter.take('victim');
    expect((await limiter.take('victim')).allowed).toBe(false);
    for (let index = 0; index < 10_000; index += 1) {
      await limiter.take(`flood-${String(index)}`);
    }
    clock.advance(10_000);
    expect(await limiter.take('victim')).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it('refuses a new key until the oldest window ends when every tracked key is blocked', async () => {
    const { clock, limiter } = setup(2);
    for (const key of ['a', 'a', 'b', 'b']) {
      await limiter.take(key);
    }
    clock.advance(20_000);
    expect(await limiter.take('c')).toEqual({ allowed: false, retryAfterSeconds: 40 });
    clock.advance(40_000);
    expect(await limiter.take('c')).toEqual({ allowed: true, remaining: 1 });
  });
});

describe('addressKey', () => {
  it('keeps IPv4 as it is, also when written as mapped IPv6', () => {
    expect(addressKey(' 203.0.113.7 ')).toBe('203.0.113.7');
    expect(addressKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('groups IPv6 by its /64 network, however the address is written', () => {
    const key = '2401:4900:1c2a:7f00::/64';
    expect(addressKey('2401:4900:1c2a:7f00:1111:2222:3333:4444')).toBe(key);
    expect(addressKey('2401:4900:1C2A:7F00::9')).toBe(key);
    expect(addressKey('2401:4900:1c2a:7f00:0:0:0:1%eth0')).toBe(key);
    expect(addressKey('2401:4900::1')).toBe('2401:4900:0:0::/64');
    expect(addressKey('::1')).toBe('0:0:0:0::/64');
  });

  it('gives null for anything that is not an address', () => {
    for (const text of [
      '',
      'unknown',
      '1::2::3',
      '1:2:3:4:5:6:7:8:9',
      '1:2:3:4:5:6:7:8::',
      '12345::1',
      'g::1',
    ]) {
      expect(addressKey(text)).toBeNull();
    }
  });
});
