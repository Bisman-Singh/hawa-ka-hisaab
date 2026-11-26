// Tests for the mapping from AQI band to the kind of day.
import { describe, expect, it } from 'vitest';
import type { AqiBand } from '../../../src/features/naqi/types.js';
import { dayKindForBand, RESTRICTING_KINDS } from '../../../src/features/planner/day-kind.js';

const BANDS: AqiBand[] = ['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe'];

describe('dayKindForBand', () => {
  it('maps every band and gives unknown for an unknown band', () => {
    expect(BANDS.map(dayKindForBand)).toEqual(['mild', 'mild', 'moderate', 'moderate', 'severe', 'severe']);
    expect(dayKindForBand(null)).toBe('unknown');
  });
});

describe('RESTRICTING_KINDS', () => {
  it('names the action kinds a mild day must not carry', () => {
    expect([...RESTRICTING_KINDS].sort()).toEqual(['move_indoors', 'protect', 'reschedule']);
  });
});
