// Tests for display rounding of effects and figures.
import { describe, expect, it } from 'vitest';
import { purifierNeed } from '../../../src/features/ledger/purifier.js';
import { figure } from '../../../src/features/planner/fact-values.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import {
  displayNumbers,
  displayValue,
  figureValue,
  formatFigure,
  percentOf,
  roundKg,
  timesOf,
} from '../../../src/features/ledger/format.js';
import { sampleCo2Effect, sampleExposureEffect, sampleWorking } from '../../support/samples.js';

describe('rounding at the edge', () => {
  it('rounds percents, multiples and kilograms for display only', () => {
    expect(percentOf(-0.4532)).toBe(-45);
    expect(timesOf(1.66)).toBe(2.7);
    expect([roundKg(0.4246), roundKg(3.644), roundKg(-12.6)]).toEqual([0.42, 3.6, -13]);
  });

  it('shows factors exactly and other inputs to one decimal', () => {
    expect(displayValue({ label: 'f', value: 0.015161, unit: '', from: 'fact', factId: 'co2-bus' })).toBe(
      0.015161,
    );
    expect(displayValue({ label: 'pm', value: 137.25, unit: '', from: 'forecast', factId: null })).toBe(
      137.3,
    );
  });
});

describe('displayNumbers', () => {
  const co2: Effect = {
    kind: 'co2',
    changeKg: -2.7,
    range: { low: -3.6, high: -1.8 },
    occupancy: 2,
    per: 'trip',
    working: {
      ...sampleWorking(),
      inputs: [{ label: 'people in the vehicle', value: 2, unit: 'people', from: 'household', factId: null }],
    },
  };

  it('lists every number an effect shows, as shown', () => {
    expect(displayNumbers(sampleExposureEffect())).toEqual([60, 0.4, 30, 0.7]);
    expect(displayNumbers(co2)).toEqual([2.7, 3.6, 1.8, 2]);
    expect(displayNumbers(sampleCo2Effect())).toEqual([2.8, 1]);
  });
});

describe('formatFigure', () => {
  it('shows a computed figure as a whole number with its unit, the value the fact set sends', () => {
    const need = purifierNeed(220);
    expect(formatFigure(need)).toBe('243 m³/h');
    expect(figureValue(need)).toBe(243);
    expect(figure('size-r2', need)[0]?.value).toBe(figureValue(need));
  });
});

describe('plannedChange', () => {
  it('is the change at the new start of a move, and its figures go in the shown numbers', async () => {
    const { shiftEffect } = await import('../../../src/features/ledger/exposure.js');
    const { displayNumbers, plannedChange } = await import('../../../src/features/ledger/format.js');
    const move = shiftEffect(['m1'], { from: { label: 'a', pm25: 200 }, to: { label: 'b', pm25: 50 } }, [
      { label: 'c', pm25: 100 },
    ]);
    expect(move && plannedChange(move)).toBeCloseTo(-0.75);
    expect(move && displayNumbers(move)).toContain(75);
    const other = { ...move, working: { ...move?.working, factIds: ['x'] } };
    expect(move && plannedChange({ ...move, working: { ...move.working, factIds: ['other'] } })).toBeNull();
    expect(other).toBeDefined();
    expect(
      move &&
        plannedChange({ ...move, working: { ...move.working, inputs: move.working.inputs.slice(0, 1) } }),
    ).toBeNull();
  });
});
