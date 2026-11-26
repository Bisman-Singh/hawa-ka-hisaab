// Tests for the intake route contract.
import { describe, expect, it } from 'vitest';
import { intakeReplySchema, intakeRequestSchema } from '../../../src/features/household/contract.js';
import { intakeResponseSchema, intakeRoute } from '../../../src/features/household/contract.js';
import { sampleHousehold, sampleTrace } from '../../support/samples.js';

describe('intakeRoute', () => {
  it('is a POST at /api/intake', () => {
    expect(intakeRoute).toMatchObject({ method: 'POST', path: '/api/intake' });
  });

  it('takes trimmed text up to 2000 characters', () => {
    expect(intakeRequestSchema.parse({ text: '  two adults and a child  ' })).toEqual({
      text: 'two adults and a child',
    });
    expect(intakeRequestSchema.safeParse({ text: 'x'.repeat(2001) }).success).toBe(false);
    expect(intakeRequestSchema.safeParse({ text: 'ok', extra: 1 }).success).toBe(false);
  });

  it('answers with a parsed household and what could not be placed', () => {
    const parsed = {
      outcome: 'parsed',
      household: sampleHousehold(),
      unplaced: ['a pet parrot'],
      assumed: ['the walk starts at 06:30'],
      trace: sampleTrace(),
    };
    expect(intakeResponseSchema.safeParse(parsed).success).toBe(true);
    expect(intakeResponseSchema.safeParse({ ...parsed, extra: 1 }).success).toBe(false);
  });

  it('holds the model to a reply with the household, what it could not place and what it assumed', () => {
    const reply = { household: sampleHousehold(), unplaced: [], assumed: [] };
    expect(intakeReplySchema.safeParse(reply).success).toBe(true);
    expect(intakeReplySchema.safeParse({ ...reply, aqi: 300 }).success).toBe(false);
    expect(intakeReplySchema.safeParse({ household: sampleHousehold(), unplaced: [] }).success).toBe(false);
  });

  it('answers that the model is unavailable instead of failing, so the form still works', () => {
    const unavailable = { outcome: 'unavailable', reason: 'quota', trace: sampleTrace() };
    expect(intakeResponseSchema.safeParse(unavailable).success).toBe(true);
  });
});
