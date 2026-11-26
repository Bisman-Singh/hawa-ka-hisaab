// Tests for the ask route contract.
import { describe, expect, it } from 'vitest';
import { askRequestSchema, askResponseSchema, askRoute } from '../../../src/features/assistant/contract.js';
import { sampleHousehold, sampleTrace } from '../../support/samples.js';

const request = () => ({
  question: 'My daughter has football at 6, can she still go?',
  household: sampleHousehold(),
  location: { lat: 28.54, lon: 77.17 },
  language: 'en',
});

describe('askRoute', () => {
  it('is a POST at /api/ask', () => {
    expect(askRoute).toMatchObject({ method: 'POST', path: '/api/ask' });
  });

  it('takes a question of up to 500 characters', () => {
    expect(askRequestSchema.safeParse(request()).success).toBe(true);
    expect(askRequestSchema.safeParse({ ...request(), question: 'x'.repeat(501) }).success).toBe(false);
  });

  it('answers with model text or the fixed medical reply, each with a trace', () => {
    const answer = {
      kind: 'answer',
      text: 'Yes, at 4 pm.',
      language: 'en',
      band: 'poor',
      factIds: [],
      trace: sampleTrace(),
    };
    const medical = {
      ...answer,
      kind: 'medical_reply',
      factIds: ['test-advisory'],
      trace: { ...sampleTrace(), producedBy: 'fixed_reply', fallbackReason: null },
    };
    expect(askResponseSchema.safeParse(answer).success).toBe(true);
    expect(askResponseSchema.safeParse(medical).success).toBe(true);
    expect(askResponseSchema.safeParse({ ...answer, kind: 'diagnosis' }).success).toBe(false);
  });
});
