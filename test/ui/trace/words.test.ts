// Tests for the trace strings: every reason and status has plain words, none of them blank.
import { describe, expect, it } from 'vitest';
import {
  guardCheckSchema,
  modelFailureKindSchema,
  numberCheckSchema,
} from '../../../src/lib/schemas/trace.js';
import {
  CALL_FAILURE,
  CHECK,
  FALLBACK,
  fallbackText,
  INPUT_FROM,
  MADE_BY,
  REFUSED,
  refusalText,
} from '../../../src/ui/trace/words.js';
import { rulesTrace } from '../plan/fixtures.js';

describe('trace strings', () => {
  it('words every fallback reason, check status, producer, input origin and call failure', () => {
    const reasons = [...modelFailureKindSchema.options, 'number_check_failed'];
    expect(Object.keys(FALLBACK).sort()).toEqual(reasons.sort());
    expect(Object.keys(CHECK).sort()).toEqual([...numberCheckSchema.shape.status.options].sort());
    const all = [FALLBACK, CHECK, MADE_BY, INPUT_FROM, CALL_FAILURE].flatMap((table) => Object.values(table));
    expect(all.every((text) => text.trim().length > 0)).toBe(true);
  });

  it('words every check that can refuse a reply, and says a refused reply was refused rather than its reason', () => {
    expect(Object.keys(REFUSED).sort()).toEqual([...guardCheckSchema.options].sort());
    expect(Object.values(REFUSED).every((text) => text.trim().length > 0 && !text.endsWith('.'))).toBe(true);
    expect(refusalText('quotes')).toBe(
      'The model did reply, but its reply was not used because it quoted words that are not the official text.',
    );
    const trace = rulesTrace('invalid_reply');
    expect(fallbackText(trace, 'invalid_reply')).toBe(FALLBACK.invalid_reply);
    expect(fallbackText({ ...trace, refusedBy: 'link' }, 'invalid_reply')).toBe(refusalText('link'));
  });
});
