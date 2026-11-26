// Tests that every number carries its working and a cited fact.
import { describe, expect, it } from 'vitest';
import {
  effectSchema,
  figureSchema,
  workingInputSchema,
  workingSchema,
} from '../../../src/features/ledger/schemas.js';
import { sampleCo2Effect, sampleExposureEffect, sampleWorking } from '../../support/samples.js';

describe('workingInputSchema', () => {
  it('accepts a household input without a fact and a factor with one', () => {
    expect(workingInputSchema.safeParse(sampleWorking().inputs[0]).success).toBe(true);
    expect(workingInputSchema.safeParse(sampleWorking().inputs[1]).success).toBe(true);
  });

  it('refuses a factor taken from a fact that does not name the fact', () => {
    const input = { label: 'factor', value: 0.1, unit: 'kg', from: 'fact', factId: null };
    const result = workingInputSchema.safeParse(input);
    expect(result.error?.issues[0]?.message).toBe('an input taken from a fact must name the fact');
  });
});

describe('workingSchema', () => {
  it('needs at least one cited fact', () => {
    expect(workingSchema.safeParse({ ...sampleWorking(), factIds: [] }).success).toBe(false);
  });
});

describe('effectSchema', () => {
  it('accepts a relative exposure change with a range and a CO2 change with occupancy', () => {
    expect(effectSchema.safeParse(sampleExposureEffect()).success).toBe(true);
    expect(effectSchema.safeParse(sampleCo2Effect()).success).toBe(true);
  });

  it('refuses a relative change below minus one, a cut of more than all of it', () => {
    const tooMuch = { ...sampleExposureEffect(), change: { low: -5, high: -3 } };
    expect(effectSchema.safeParse(tooMuch).error?.issues[0]?.message).toBe(
      'a relative change cannot fall below -1',
    );
    expect(
      effectSchema.safeParse({ ...sampleExposureEffect(), change: { low: -1, high: 1.5 } }).success,
    ).toBe(true);
  });

  it('refuses an exposure change without a range', () => {
    expect(effectSchema.safeParse({ ...sampleExposureEffect(), change: -0.4 }).success).toBe(false);
  });

  it('has no kind for microgram doses or PM added', () => {
    expect(effectSchema.safeParse({ ...sampleExposureEffect(), kind: 'dose_ug' }).success).toBe(false);
  });
});

describe('figureSchema', () => {
  it('accepts a labelled figure with its working', () => {
    const figure = { label: 'Purifier size', value: 160, unit: 'm3 per hour', working: sampleWorking() };
    expect(figureSchema.safeParse(figure).success).toBe(true);
  });
});
