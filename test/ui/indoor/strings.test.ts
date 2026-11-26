// Tests for the indoor strings: every step topic the planner makes has a place in the view.
import { describe, expect, it } from 'vitest';
import { indoorStepSchema } from '../../../src/features/planner/schemas.js';
import { STEP_PART } from '../../../src/ui/indoor/strings.js';

describe('STEP_PART', () => {
  it('places every topic, with corrected claims apart from the home steps', () => {
    expect(Object.keys(STEP_PART).sort()).toEqual([...indoorStepSchema.shape.topic.options].sort());
    expect(STEP_PART.myth).toBe('claims');
    expect(STEP_PART.purifier).toBe('purifier');
  });
});
