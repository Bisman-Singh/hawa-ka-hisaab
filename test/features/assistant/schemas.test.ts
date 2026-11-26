// Tests for the model's reply to a follow-up question.
import { describe, expect, it } from 'vitest';
import { askReplySchema } from '../../../src/features/assistant/schemas.js';

describe('askReplySchema', () => {
  it('accepts text only', () => {
    expect(askReplySchema.safeParse({ text: 'Yes, before four.' }).success).toBe(true);
    expect(askReplySchema.safeParse({ text: 'Yes.', aqi: 120 }).success).toBe(false);
    expect(askReplySchema.safeParse({ text: '' }).success).toBe(false);
  });
});
