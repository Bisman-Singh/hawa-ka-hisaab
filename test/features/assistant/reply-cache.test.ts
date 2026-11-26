// Tests for the short reply cache: hits within the time to live, real expiry, and the oldest dropped when full.
import { describe, expect, it } from 'vitest';
import { createReplyCache, MODEL_CACHE_TTL_MS } from '../../../src/features/assistant/reply-cache.js';
import { createFakeClock } from '../../support/fake-clock.js';

describe('createReplyCache', () => {
  it('returns a stored value until its time to live passes, then forgets it', () => {
    const clock = createFakeClock();
    const cache = createReplyCache<string>({ ttlMs: MODEL_CACHE_TTL_MS, maxEntries: 10, clock });
    expect(cache.get('a')).toBeNull();
    cache.set('a', 'parsed');
    clock.advance(MODEL_CACHE_TTL_MS - 1);
    expect(cache.get('a')).toBe('parsed');
    clock.advance(1);
    expect(cache.get('a')).toBeNull();
  });

  it('drops the oldest entry when full and refreshes an entry set again', () => {
    const clock = createFakeClock();
    const cache = createReplyCache<number>({ ttlMs: 1000, maxEntries: 2, clock });
    cache.set('a', 1);
    clock.advance(10);
    cache.set('b', 2);
    cache.set('a', 3);
    cache.set('c', 4);
    expect([cache.get('a'), cache.get('b'), cache.get('c')]).toEqual([3, null, 4]);
  });

  it('keeps a five minute time to live', () => {
    expect(MODEL_CACHE_TTL_MS).toBe(300_000);
  });
});
