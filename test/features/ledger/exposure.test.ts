// Tests for exposure as a relative change, with property checks over many generated cases.
import { describe, expect, it } from 'vitest';
import {
  changeRange,
  inhaledRatio,
  modeEffect,
  shiftEffect,
  type Breathing,
} from '../../../src/features/ledger/exposure.js';
import { relativeChangeSchema } from '../../../src/features/ledger/schemas.js';

/** A small seeded generator, so the property cases are the same on every run. */
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function cases(count: number): Breathing[] {
  const next = generator(7);
  return Array.from({ length: count }, () => ({
    pm25: next() * 500,
    microRatio: 0.3 + next() * 1.5,
    litresPerMinute: 4 + next() * 50,
    minutes: 1 + Math.floor(next() * 600),
  }));
}

describe('inhaledRatio', () => {
  it('does not change when only the hour changes to one with the same forecast value', () => {
    for (const before of cases(200)) {
      expect(inhaledRatio(before, { ...before })).toBe(1);
    }
  });

  it('never rises when the time outdoors is halved', () => {
    for (const before of cases(200)) {
      const ratio = inhaledRatio(before, { ...before, minutes: before.minutes / 2 });
      expect(ratio === null || ratio <= 1).toBe(true);
    }
  });

  it('never gives a change below minus one, whatever the inputs', () => {
    const all = cases(200);
    for (const [index, before] of all.entries()) {
      const after = all[(index + 1) % all.length] ?? before;
      const ratio = inhaledRatio(before, { ...after, pm25: index % 5 === 0 ? 0 : after.pm25 });
      expect(ratio === null || relativeChangeSchema.safeParse(changeRange([ratio])).success).toBe(true);
    }
  });

  it('is null when nothing was breathed in before', () => {
    const zero: Breathing = { pm25: 0, microRatio: 1, litresPerMinute: 10, minutes: 30 };
    expect(inhaledRatio(zero, { ...zero, pm25: 50 })).toBeNull();
  });
});

describe('shiftEffect', () => {
  it('gives the forecast ratio, with the range covering an hour either side', () => {
    const effect = shiftEffect(
      ['m1'],
      { from: { label: '18:00 to 19:00', pm25: 300 }, to: { label: '14:00 to 15:00', pm25: 150 } },
      [{ label: '13:00 to 14:00', pm25: 180 }],
    );
    expect(effect?.kind === 'exposure' && effect.change).toEqual({ low: -0.5, high: -0.4 });
    expect(effect?.working.inputs).toHaveLength(3);
    expect(effect?.working.factIds).toEqual(['exposure-dose-method']);
  });

  it('is null when the usual hours had no PM2.5', () => {
    expect(
      shiftEffect(['m1'], { from: { label: 'a', pm25: 0 }, to: { label: 'b', pm25: 10 } }, []),
    ).toBeNull();
  });
});

describe('modeEffect', () => {
  it('compares air inside times breathing for the same minutes, with a car spanning AC to open windows', () => {
    const effect = modeEffect(['m1'], 'car', 'bus');
    expect(effect?.kind === 'exposure' && effect.change.low).toBeCloseTo(12 / 13 - 1, 10);
    expect(effect?.kind === 'exposure' && effect.change.high).toBeCloseTo(12 / 5 - 1, 10);
    const cycle = modeEffect(['m1'], 'cycle', 'metro');
    expect(cycle?.kind === 'exposure' && cycle.change.low).toBeCloseTo(8 / 38.5 - 1, 10);
  });

  it('is null for the same mode, a mode with no measured ratio, or no members', () => {
    expect(modeEffect(['m1'], 'bus', 'bus')).toBeNull();
    expect(modeEffect(['m1'], 'car', 'suburban_rail')).toBeNull();
    expect(modeEffect(['m1'], 'suburban_rail', 'car')).toBeNull();
    expect(modeEffect([], 'car', 'bus')).toBeNull();
  });
});
