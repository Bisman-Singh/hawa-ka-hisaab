// Tests for the JSON value schemas.
import { describe, expect, it } from 'vitest';
import { jsonObjectSchema, jsonValueSchema } from '../../src/lib/json.js';

describe('jsonValueSchema', () => {
  it('accepts nested JSON values', () => {
    const value = { a: [1, 'two', true, null, { b: [] }] };
    expect(jsonValueSchema.parse(value)).toEqual(value);
  });

  it('refuses values JSON cannot carry', () => {
    expect(jsonValueSchema.safeParse(undefined).success).toBe(false);
    expect(jsonValueSchema.safeParse(() => 1).success).toBe(false);
    expect(jsonValueSchema.safeParse({ a: Number.NaN }).success).toBe(false);
  });
});

describe('jsonObjectSchema', () => {
  it('accepts objects and refuses arrays and scalars', () => {
    expect(jsonObjectSchema.safeParse({ km: 4 }).success).toBe(true);
    expect(jsonObjectSchema.safeParse([1]).success).toBe(false);
    expect(jsonObjectSchema.safeParse('text').success).toBe(false);
  });
});
