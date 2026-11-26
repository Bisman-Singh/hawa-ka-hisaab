// Tests for the trace strings: every reason and status has plain words, none of them blank.
import { describe, expect, it } from 'vitest';
import { modelFailureKindSchema, numberCheckSchema } from '../../../src/lib/schemas/trace.js';
import { CALL_FAILURE, CHECK, FALLBACK, INPUT_FROM, MADE_BY } from '../../../src/ui/trace/strings.js';

describe('trace strings', () => {
  it('words every fallback reason, check status, producer, input origin and call failure', () => {
    const reasons = [...modelFailureKindSchema.options, 'number_check_failed'];
    expect(Object.keys(FALLBACK).sort()).toEqual(reasons.sort());
    expect(Object.keys(CHECK).sort()).toEqual([...numberCheckSchema.shape.status.options].sort());
    const all = [FALLBACK, CHECK, MADE_BY, INPUT_FROM, CALL_FAILURE].flatMap((table) => Object.values(table));
    expect(all.every((text) => text.trim().length > 0)).toBe(true);
  });
});
