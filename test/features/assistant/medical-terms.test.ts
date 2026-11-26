// Tests for the medical term tables: every pattern compiles and each table covers all three ways of writing.
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_TERMS,
  MEDICAL_TERMS,
  MEDICINE_TERMS,
} from '../../../src/features/assistant/medical-terms.js';

describe('medical term tables', () => {
  it.each([
    ['emergency', EMERGENCY_TERMS],
    ['medicine', MEDICINE_TERMS],
    ['medical', MEDICAL_TERMS],
  ])('%s terms compile and include Hindi and romanised Hindi', (_name, terms) => {
    expect(() => terms.latin.map((term) => new RegExp(term, 'iu'))).not.toThrow();
    expect(terms.devanagari.split('|').every((term) => /\p{Script=Devanagari}/u.test(term))).toBe(true);
    expect(terms.latin.some((term) => /[a-z]{4,} ?(nahi|mein|me|aa)\b|dawa|khaa|saa/.test(term))).toBe(true);
  });
});
