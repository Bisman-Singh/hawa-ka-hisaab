// Tests for the household words that take values, and that every model failure has plain words.
import { describe, expect, it } from 'vitest';
import { modelFailureKindSchema } from '../../../src/lib/schemas/trace.js';
import { fill } from '../../../src/lib/template.js';
import { charsText, fixText, FORM, MODEL_DOWN } from '../../../src/ui/household/words.js';

describe('household words', () => {
  it('counts characters and names the limit', () => {
    expect(charsText(12)).toBe('12 of 2000 characters.');
    expect(charsText(2400, true)).toBe('This is 2400 characters. Keep it to 2000.');
  });

  it('counts problems in the singular and plural, and names rows by number', () => {
    expect(fixText(1)).toBe('1 field needs a fix. The first is in focus.');
    expect(fixText(3)).toBe('3 fields need a fix. The first is in focus.');
    expect(fill(FORM.person, { n: 2 })).toBe('Person 2');
    expect(fill(FORM.outing, { n: 1 })).toBe('Outing 1');
    expect(fill(FORM.removed, { what: fill(FORM.room, { n: 3 }) })).toBe('Room 3 removed.');
  });

  it('has plain words for every reason the model can be unavailable', () => {
    const reasons = [...modelFailureKindSchema.options, 'number_check_failed'];
    expect(Object.keys(MODEL_DOWN).sort()).toEqual(reasons.sort());
  });
});
