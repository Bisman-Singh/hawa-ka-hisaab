// Tests for the system clock.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { systemClock } from '../../src/lib/clock.js';

describe('systemClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the system time in epoch milliseconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse('2026-11-24T16:30:00Z'));
    expect(systemClock.now()).toBe(Date.parse('2026-11-24T16:30:00Z'));
  });
});
