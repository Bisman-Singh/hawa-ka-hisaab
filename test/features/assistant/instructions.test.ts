// Tests for the fixed instructions: user text never goes in them, and the retry note names the failed check.
import { describe, expect, it } from 'vitest';
import {
  ASK_INSTRUCTIONS,
  INTAKE_INSTRUCTIONS,
  NOTICE_INSTRUCTIONS,
  PLAN_INSTRUCTIONS,
  RETRY_NOTES,
  retryInstructions,
} from '../../../src/features/assistant/instructions.js';

const all = [INTAKE_INSTRUCTIONS, PLAN_INSTRUCTIONS, ASK_INSTRUCTIONS, NOTICE_INSTRUCTIONS];

describe('task instructions', () => {
  it('point at DATA, keep numbers to what was sent, and hold no placeholders for user text', () => {
    for (const text of all) {
      expect(text).toMatch(/DATA/);
      expect(text).not.toMatch(/\$\{|\{\{/);
    }
    expect(
      [INTAKE_INSTRUCTIONS, PLAN_INSTRUCTIONS, ASK_INSTRUCTIONS, NOTICE_INSTRUCTIONS].every((t) =>
        t.includes('HH:MM'),
      ),
    ).toBe(true);
    expect(INTAKE_INSTRUCTIONS).toMatch(/Never estimate a distance/);
    expect(ASK_INSTRUCTIONS).toMatch(/never one that appears only in the question/);
  });
});

describe('retryInstructions', () => {
  it('adds the fixed note for the failed check after the task', () => {
    const text = retryInstructions(PLAN_INSTRUCTIONS, 'numbers');
    expect(text.startsWith(PLAN_INSTRUCTIONS)).toBe(true);
    expect(text).toMatch(new RegExp(`rejected by a check: ${RETRY_NOTES.numbers}`));
  });
});
