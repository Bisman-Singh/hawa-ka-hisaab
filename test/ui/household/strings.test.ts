// Tests for the household words that take values, and that every model failure has plain words.
import { describe, expect, it } from 'vitest';
import { modelFailureKindSchema } from '../../../src/lib/schemas/trace.js';
import { FORM, INTAKE, MODEL_DOWN } from '../../../src/ui/household/strings.js';

describe('household words', () => {
  it('counts characters and names the limit', () => {
    expect(INTAKE.count(12)).toBe('12 of 2000 characters.');
    expect(INTAKE.tooLong(2400)).toBe('This is 2400 characters. Keep it to 2000.');
  });

  it('counts problems in the singular and plural, and names rows by number', () => {
    expect(FORM.fix(1)).toBe('1 field needs a fix. The first is in focus.');
    expect(FORM.fix(3)).toBe('3 fields need a fix. The first is in focus.');
    expect(FORM.person(2)).toBe('Person 2');
    expect(FORM.outing(1)).toBe('Outing 1');
    expect(FORM.room(3)).toBe('Room 3');
    expect(FORM.removed('Room 3')).toBe('Room 3 removed.');
  });

  it('has plain words for every reason the model can be unavailable', () => {
    expect(Object.keys(MODEL_DOWN).sort()).toEqual([...modelFailureKindSchema.options].sort());
  });
});
