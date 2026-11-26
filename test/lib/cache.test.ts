// Tests for the TTL cache: freshness, shared in-flight loads, last good value, backoff and eviction.
import { describe, expect, it, vi } from 'vitest';
import { createTtlCache } from '../../src/lib/cache.js';
import { err, ok, type Result } from '../../src/lib/result.js';
import { createFakeClock } from '../support/fake-clock.js';

const HOUR = 3_600_000;

function setup(maxEntries = 10) {
  const clock = createFakeClock(0);
  const cache = createTtlCache<string, string>({
    ttlMs: HOUR,
    retryAfterFailureMs: 60_000,
    maxEntries,
    clock,
  });
  return { clock, cache };
}

const loads = (value: string) => vi.fn(() => Promise.resolve<Result<string, string>>(ok(value)));
const fails = (error: string) => vi.fn(() => Promise.resolve<Result<string, string>>(err(error)));

describe('createTtlCache', () => {
  it('loads once and serves the stored value while it is fresh', async () => {
    const { clock, cache } = setup();
    const load = loads('feed-1');
    expect(await cache.read('feed', load)).toEqual({ kind: 'fresh', value: 'feed-1', storedAt: 0 });
    clock.advance(HOUR - 1);
    expect(await cache.read('feed', load)).toEqual({ kind: 'fresh', value: 'feed-1', storedAt: 0 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads again once the time to live has passed', async () => {
    const { clock, cache } = setup();
    await cache.read('feed', loads('feed-1'));
    clock.advance(HOUR);
    const second = loads('feed-2');
    expect(await cache.read('feed', second)).toEqual({ kind: 'fresh', value: 'feed-2', storedAt: HOUR });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('shares one load between concurrent reads of a key', async () => {
    const { cache } = setup();
    let release: (value: Result<string, string>) => void = () => undefined;
    const load = vi.fn(
      () =>
        new Promise<Result<string, string>>((resolve) => {
          release = resolve;
        }),
    );
    const first = cache.read('feed', load);
    const second = cache.read('feed', load);
    release(ok('feed-1'));
    expect(await first).toEqual(await second);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports a miss when the first load fails', async () => {
    const { cache } = setup();
    expect(await cache.read('feed', fails('timeout'))).toEqual({ kind: 'miss', error: 'timeout' });
    expect(cache.size()).toBe(0);
  });

  it('serves the last good value when a reload fails', async () => {
    const { clock, cache } = setup();
    await cache.read('feed', loads('feed-1'));
    clock.advance(HOUR);
    expect(await cache.read('feed', fails('network'))).toEqual({
      kind: 'last_good',
      value: 'feed-1',
      storedAt: 0,
      error: 'network',
    });
  });

  it('waits before calling a failing loader again', async () => {
    const { clock, cache } = setup();
    const load = fails('network');
    await cache.read('feed', load);
    clock.advance(59_999);
    expect(await cache.read('feed', load)).toEqual({ kind: 'miss', error: 'network' });
    expect(load).toHaveBeenCalledTimes(1);
    clock.advance(1);
    await cache.read('feed', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('serves the last good value during the backoff after a failed reload', async () => {
    const { clock, cache } = setup();
    await cache.read('feed', loads('feed-1'));
    clock.advance(HOUR);
    await cache.read('feed', fails('status'));
    const load = loads('feed-2');
    expect(await cache.read('feed', load)).toMatchObject({
      kind: 'last_good',
      value: 'feed-1',
      error: 'status',
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('evicts the oldest entry beyond maxEntries, counting a refreshed key as newest', async () => {
    const { clock, cache } = setup(2);
    await cache.read('a', loads('1'));
    await cache.read('b', loads('2'));
    clock.advance(HOUR);
    await cache.read('a', loads('3'));
    await cache.read('c', loads('4'));
    expect(cache.size()).toBe(2);
    const reloadB = loads('5');
    await cache.read('b', reloadB);
    expect(reloadB).toHaveBeenCalledTimes(1);
  });

  it('holds failures for at most maxEntries keys, so failing keys cannot grow memory', async () => {
    const { cache } = setup(2);
    await cache.read('a', fails('network'));
    await cache.read('b', fails('network'));
    await cache.read('c', fails('network'));
    const retryA = fails('network');
    await cache.read('a', retryA);
    expect(retryA).toHaveBeenCalledTimes(1);
    const retryC = fails('network');
    await cache.read('c', retryC);
    expect(retryC).not.toHaveBeenCalled();
  });

  it('lets a rejection through and clears the in-flight load so the next read retries', async () => {
    const { cache } = setup();
    const broken = vi.fn(() => Promise.reject(new Error('loader bug')));
    await expect(cache.read('feed', broken)).rejects.toThrow('loader bug');
    const load = loads('feed-1');
    expect(await cache.read('feed', load)).toMatchObject({ kind: 'fresh', value: 'feed-1' });
  });
});
