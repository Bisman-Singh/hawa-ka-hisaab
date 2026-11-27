// Tests for effects laid out for the page: the headline, the range or basis line, the reason beside a wide range
// and the plain sentence, in English and Hindi, and a range that crosses zero never headlined as a cut.
import { describe, expect, it } from 'vitest';
import { changeInWords, effectDisplay, WIDE_POINTS } from '../../../src/features/ledger/display.js';
import { modeEffect, shiftEffect } from '../../../src/features/ledger/exposure.js';
import { closedCarEffect, lightPaceEffect, maskEffect } from '../../../src/features/ledger/protection.js';
import type { Member } from '../../../src/features/household/types.js';
import type { Effect } from '../../../src/features/ledger/types.js';
import { sampleWorking } from '../../support/samples.js';

const adult: Member = { id: 'm1', ageGroup: 'adult', flags: [] };
const shift = shiftEffect(
  ['m1'],
  { from: { label: '07:00 to 07:40', pm25: 200 }, to: { label: '15:00 to 15:40', pm25: 62 } },
  [
    { label: '14:00 to 14:40', pm25: 78 },
    { label: '16:00 to 16:40', pm25: 66 },
  ],
);
const exposure = (low: number, high: number): Effect => ({
  kind: 'exposure',
  change: { low, high },
  memberIds: ['m1'],
  working: sampleWorking(),
});

describe('effectDisplay for exposure', () => {
  it('headlines a move by its own start and gives the range an hour either side on the second line', () => {
    expect(shift && effectDisplay(shift)).toEqual({
      direction: 'less',
      headline: '69% less',
      detail: 'range 61 to 69%, starting an hour earlier or later',
      note: null,
      sentence: '69% less breathed in, range 61 to 69%, starting an hour earlier or later.',
    });
    const alone = shiftEffect(['m1'], { from: { label: 'a', pm25: 200 }, to: { label: 'b', pm25: 100 } }, []);
    expect(alone && effectDisplay(alone).detail).toBe('by the model forecast');
  });

  it('never headlines a range that could be a cut or a rise as a cut, and says why it is wide', () => {
    const bus = modeEffect(['m1'], 'car', 'bus');
    const shown = bus && effectDisplay(bus);
    expect(shown).toMatchObject({ direction: 'mixed', headline: 'Up to 2.4× as much' });
    expect(shown?.detail).toBe("or 8% less, depending on the car's windows and AC");
    expect(shown?.note).toMatch(/closed car with AC keeps out far more/);
    expect(shown?.sentence).toBe(
      "Up to 2.4 times as much breathed in, or 8% less, depending on the car's windows and AC.",
    );
    expect(shown?.headline).not.toMatch(/less/);
  });

  it('shows a range with no planned point as the headline, with what it spans, and a reason when wide', () => {
    const mask = maskEffect([adult]);
    expect(mask && effectDisplay(mask)).toMatchObject({
      headline: '32 to 98% less',
      detail: 'a loose mask to a well fitted N95',
    });
    expect(mask && effectDisplay(mask).note).toMatch(/fit decides most of it/);
    const pace = lightPaceEffect([adult]);
    expect(pace && effectDisplay(pace)).toMatchObject({
      detail: 'light pace against a usual moderate to hard pace',
      note: null,
    });
    const car = closedCarEffect(['m1']);
    expect(car && effectDisplay(car)).toMatchObject({
      headline: '62% less',
      detail: 'windows up with AC, against windows open',
    });
  });

  it('words rises, multiples and no change plainly, and an unknown method as worked out', () => {
    expect(effectDisplay(exposure(0.2, 0.4))).toMatchObject({
      direction: 'more',
      headline: '20 to 40% more',
    });
    expect(effectDisplay(exposure(0.4, 1.4)).headline).toBe('40% more to 2.4× as much');
    expect(effectDisplay(exposure(1.2, 1.6)).headline).toBe('2.2 to 2.6× as much');
    expect(effectDisplay(exposure(0.001, 0.002))).toMatchObject({ direction: 'none', headline: 'No change' });
    expect(effectDisplay(exposure(-0.3, -0.3))).toMatchObject({
      headline: '30% less',
      detail: 'as worked out',
    });
    expect(effectDisplay(exposure(-0.9, -0.9 + WIDE_POINTS / 100)).note).toMatch(/inputs vary/);
  });

  it('says the same in Hindi with the same figures', () => {
    expect(shift && effectDisplay(shift, 'hi')).toMatchObject({
      headline: '69% कम',
      detail: 'दायरा 61 से 69%, एक घंटा पहले या बाद शुरू करने पर',
    });
    const bus = modeEffect(['m1'], 'car', 'bus');
    expect(bus && effectDisplay(bus, 'hi').headline).toBe('2.4 गुना तक');
    expect(bus && effectDisplay(bus, 'hi').sentence.endsWith('।')).toBe(true);
  });
});

describe('changeInWords', () => {
  it('gives one change in plain words for sentences, in either language', () => {
    expect(changeInWords(-0.08)).toBe('8% less');
    expect(changeInWords(1.4)).toBe('2.4 times as much');
    expect(changeInWords(0.25, 'hi')).toBe('25% ज्यादा');
  });
});
