// Tests for the shared schema primitives.
import { describe, expect, it } from 'vitest';
import { allUnique, boundedText, clockTimeSchema, isoDateSchema } from '../../../src/lib/schemas/common.js';
import { isoDateTimeSchema, languageSchema, rangeSchema } from '../../../src/lib/schemas/common.js';

describe('timestamps and dates', () => {
  it('accepts ISO timestamps with an offset or Z and refuses the CPCB text form', () => {
    expect(isoDateTimeSchema.safeParse('2026-11-24T22:00:00+05:30').success).toBe(true);
    expect(isoDateTimeSchema.safeParse('2026-11-24T16:30:00.000Z').success).toBe(true);
    expect(isoDateTimeSchema.safeParse('24-11-2026 22:00:00').success).toBe(false);
  });

  it('accepts calendar dates only', () => {
    expect(isoDateSchema.safeParse('2026-11-24').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-11-31').success).toBe(false);
  });
});

describe('clockTimeSchema', () => {
  it('accepts 24 hour HH:MM from 00:00 to 23:59', () => {
    for (const time of ['00:00', '07:30', '23:59']) {
      expect(clockTimeSchema.safeParse(time).success).toBe(true);
    }
  });

  it('refuses other forms', () => {
    for (const time of ['24:00', '7:30', '07:60', '6 pm']) {
      expect(clockTimeSchema.safeParse(time).success).toBe(false);
    }
  });
});

describe('languageSchema', () => {
  it('accepts English and Hindi', () => {
    expect(languageSchema.options).toEqual(['en', 'hi']);
  });
});

describe('rangeSchema', () => {
  it('accepts a range with low at or below high', () => {
    expect(rangeSchema.safeParse({ low: -0.6, high: -0.3 }).success).toBe(true);
    expect(rangeSchema.safeParse({ low: 1, high: 1 }).success).toBe(true);
  });

  it('refuses a range with low above high', () => {
    const result = rangeSchema.safeParse({ low: 2, high: 1 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('low must not exceed high');
  });
});

describe('boundedText', () => {
  it('trims, refuses empty text and caps the length', () => {
    const schema = boundedText(5);
    expect(schema.parse('  hi  ')).toBe('hi');
    expect(schema.safeParse('   ').success).toBe(false);
    expect(schema.safeParse('sixsix').success).toBe(false);
  });
});

describe('allUnique', () => {
  it('tells lists without repeats from lists with them', () => {
    expect(allUnique([])).toBe(true);
    expect(allUnique(['m1', 'm2'])).toBe(true);
    expect(allUnique(['m1', 'm2', 'm1'])).toBe(false);
  });
});
