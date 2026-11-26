// Tests for reading hours in Indian time, ages and staleness.
import { describe, expect, it } from 'vitest';
import { ageWords, dateWords, istClock, istDay, isStale } from '../../../src/ui/place/hours.js';

const HOUR = '2026-11-24T22:00:00+05:30';
const at = (iso: string): number => Date.parse(iso);

describe('hours', () => {
  it('reads the clock and day in Indian time whatever the offset written', () => {
    expect(istClock(HOUR)).toBe('22:00');
    expect(istClock('2026-11-24T16:30:00Z')).toBe('22:00');
    expect(istDay('2026-11-24T19:00:00Z')).toBe('25 Nov');
    expect(dateWords('2026-11-17')).toBe('17 Nov 2026');
    expect(dateWords('2027-01-02')).toBe('2 Jan 2027');
  });

  it('says an age in hours and minutes, dropping a zero part', () => {
    expect(ageWords(HOUR, at('2026-11-25T02:40:00+05:30'))).toBe('4 hours 40 minutes');
    expect(ageWords(HOUR, at('2026-11-24T23:00:00+05:30'))).toBe('1 hour');
    expect(ageWords(HOUR, at('2026-11-24T22:25:00+05:30'))).toBe('25 minutes');
    expect(ageWords(HOUR, at('2026-11-24T21:00:00+05:30'))).toBe('0 minutes');
  });

  it('marks a reading stale past three hours, or when the server already did', () => {
    expect(isStale(HOUR, at('2026-11-25T01:01:00+05:30'), false)).toBe(true);
    expect(isStale(HOUR, at('2026-11-25T00:59:00+05:30'), false)).toBe(false);
    expect(isStale(HOUR, at('2026-11-24T22:10:00+05:30'), true)).toBe(true);
  });
});
