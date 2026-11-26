// Tests for the exposure factors: the Delhi study ratios and breathing rates, and the EPA rates.
import { describe, expect, it } from 'vitest';
import { EXPOSURE_FACTS } from '../../../src/config/facts/exposure.js';

const valueOf = (id: string): number | null => {
  const fact = EXPOSURE_FACTS.find((found) => found.id === id);
  return fact?.kind === 'number' ? fact.value : null;
};

describe('exposure factors', () => {
  it('turn the study percentages into ratios against the air outside', () => {
    expect(valueOf('exposure-ratio-walk')).toBe(1.4);
    expect(valueOf('exposure-ratio-cycle')).toBe(1.1);
    expect(valueOf('exposure-ratio-car-ac')).toBe(0.5);
    expect(valueOf('exposure-ratio-metro')).toBe(0.8);
    expect(valueOf('exposure-cycle-per-km')).toBe(9);
  });

  it('carry the breathing rates used by the study and by EPA', () => {
    expect([
      valueOf('ventilation-vehicle'),
      valueOf('ventilation-walk'),
      valueOf('ventilation-cycle'),
    ]).toEqual([10, 15, 35]);
    expect(['light', 'moderate', 'high'].map((effort) => valueOf(`breathing-adult-${effort}`))).toEqual([
      12, 26, 50,
    ]);
    expect(['light', 'moderate', 'high'].map((effort) => valueOf(`breathing-child-${effort}`))).toEqual([
      11, 22, 42,
    ]);
  });
});
