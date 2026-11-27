// Tests for display rounding and the wording of effects.
import { describe, expect, it } from 'vitest';
import { purifierNeed } from '../../../src/features/ledger/purifier.js';
import { figure } from '../../../src/features/planner/fact-values.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import {
  clockOf,
  describeChange,
  displayNumbers,
  displayValue,
  figureValue,
  formatEffect,
  formatFigure,
  minutesOf,
  percentOf,
  roundKg,
  timesOf,
} from '../../../src/features/ledger/format.js';
import { sampleCo2Effect, sampleExposureEffect, sampleWorking } from '../../support/samples.js';

describe('clock times', () => {
  it('convert both ways and wrap past midnight', () => {
    expect(minutesOf('07:30')).toBe(450);
    expect(clockOf(450)).toBe('07:30');
    expect(clockOf(1500)).toBe('01:00');
    expect(clockOf(-60)).toBe('23:00');
  });
});

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

describe('describeChange', () => {
  it('words cuts, rises, multiples and spans across zero', () => {
    expect(describeChange({ low: 0, high: 0.001 })).toBe('no change');
    expect(describeChange({ low: -0.45, high: -0.3 })).toBe('a cut of 30 to 45 percent');
    expect(describeChange({ low: -0.69, high: -0.69 })).toBe('a cut of about 69 percent');
    expect(describeChange({ low: 0.2, high: 0.6 })).toBe('a rise of 20 to 60 percent');
    expect(describeChange({ low: 0.4, high: 2.6 })).toBe('1.4 to 3.6 times as much');
    expect(describeChange({ low: -0.08, high: 1.4 })).toBe(
      'anywhere from a cut of 8 percent to 2.4 times as much',
    );
    expect(describeChange({ low: -0.08, high: 0.3 })).toBe(
      'anywhere from a cut of 8 percent to a rise of 30 percent',
    );
  });
});

describe('formatEffect and displayNumbers', () => {
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

  it('words an exposure effect and a CO2 effect with or without a range', () => {
    expect(formatEffect(sampleExposureEffect())).toBe('a cut of 30 to 60 percent in what is breathed in');
    expect(formatEffect(sampleCo2Effect())).toBe('2.8 kg less CO2 a trip for each person');
    expect(formatEffect(co2)).toBe('1.8 to 3.6 kg less CO2 a trip for each person, with 2 in the vehicle');
    expect(formatEffect({ ...co2, changeKg: 0.15, range: null })).toBe(
      '0.15 kg more CO2 a trip for each person, with 2 in the vehicle',
    );
  });

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
