// Tests for clock times and dates in Indian time: both ways between minutes and HH:MM, an instant's IST parts
// across the date line, and dates and days in English and Hindi words.
import { describe, expect, it } from 'vitest';
import { clockOf, dateText, istClock, istDay, istParts, minutesOf } from '../../src/lib/time.js';

describe('clock times', () => {
  it('convert both ways, pad and wrap past midnight', () => {
    expect(minutesOf('07:30')).toBe(450);
    expect(minutesOf('13:10')).toBe(790);
    expect(clockOf(450)).toBe('07:30');
    expect(clockOf(7 * 60 + 5)).toBe('07:05');
    expect(clockOf(1500)).toBe('01:00');
    expect(clockOf(-60)).toBe('23:00');
  });
});

describe('istParts, istClock and istDay', () => {
  it('read an instant in IST whatever the offset written, across the date line', () => {
    expect(istParts(Date.parse('2026-11-25T19:00:00Z'))).toEqual({
      date: '2026-11-26',
      month: 11,
      hour: 0,
      minute: 30,
    });
    expect(istClock('2026-11-24T22:00:00+05:30')).toBe('22:00');
    expect(istClock('2026-11-24T16:30:00Z')).toBe('22:00');
    expect(istDay('2026-11-24T19:00:00Z')).toBe('25 Nov');
  });
});

describe('dateText', () => {
  it('writes the date in English by default and in Hindi with the same digits', () => {
    expect(dateText('2026-11-17')).toBe('17 Nov 2026');
    expect(dateText('2027-01-02')).toBe('2 Jan 2027');
    expect(dateText('2026-11-07', 'hi')).toBe('7 नवंबर 2026');
    expect(dateText('2027-01-26', 'hi')).toBe('26 जनवरी 2027');
  });
});
