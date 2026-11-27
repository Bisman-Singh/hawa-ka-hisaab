// Tests for the labelled number builders of the fact set.
import { describe, expect, it } from 'vitest';
import { cited, clock, figure, shown, value } from '../../../src/features/planner/fact-values.js';
import { factValueSchema } from '../../../src/lib/schemas/facts.js';
import { purifierNeed } from '../../../src/features/ledger/purifier.js';
import { sampleCo2Effect } from '../../support/samples.js';
import type { WorkingInput } from '../../../src/features/ledger/types.js';

describe('fact values', () => {
  it('make ids safe for the fact id rule and cut long labels', () => {
    const made = value({ id: 'move-a_1-', label: 'x'.repeat(130) }, 3);
    expect(made).toEqual({ id: 'move-a-1', label: 'x'.repeat(120), value: 3, unit: '' });
    expect(factValueSchema.safeParse(made).success).toBe(true);
  });

  it('give a number fact and its range ends, the numerals of a quote, and nothing for an unknown id', () => {
    expect(cited('coil-cigarettes').map((fact) => fact.value)).toEqual([75, 75, 137]);
    expect(cited('advice-ventilate').map((fact) => fact.value)).toEqual([12, 4]);
    expect(cited('no-such-fact')).toEqual([]);
  });

  it('give a clock time in 24 and 12 hour forms with its minutes', () => {
    expect(clock('t', 'Start', '14:30').map((fact) => fact.value)).toEqual([14, 2, 30]);
    expect(clock('t', 'Start', '00:00').map((fact) => fact.value)).toEqual([0, 12, 0]);
    expect(clock('t', 'Start', '12:00').map((fact) => fact.value)).toEqual([12, 12, 0]);
  });

  it('give an effect as shown, without its working, and a figure with its inputs but no forecast values', () => {
    expect(shown('swap-a1', sampleCo2Effect()).map((fact) => fact.value)).toEqual([2.8, 1]);
    const need = figure('purifier-r1', purifierNeed(100));
    expect(need.map((fact) => fact.value)).toEqual([110, 110, 100, 65, 1.69901]);
    const forecastInput: WorkingInput = {
      label: 'Forecast PM2.5, 14:00 hour, a model',
      value: 61.2,
      unit: 'µg/m³',
      from: 'forecast',
      factId: null,
    };
    const sized = purifierNeed(100);
    const window = { ...sized, working: { ...sized.working, inputs: [forecastInput] } };
    expect(figure('ventilate', window).map((fact) => fact.value)).toEqual([110, 110]);
  });
});
