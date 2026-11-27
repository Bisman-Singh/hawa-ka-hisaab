// Tests for the plan words: each slot is named, the modelled label says it is not a measurement, and Hindi has every
// label English has, in Devanagari, spelt as the plan text tables spell it, with the same {time} and {count} slots.
import { describe, expect, it } from 'vitest';
import { PLAN, PLAN_LABELS, STRIP } from '../../../src/ui/plan/words.js';

const flat = (labels: object): string[] =>
  Object.values(labels).flatMap((value: unknown) =>
    typeof value === 'string' ? [value] : flat(value instanceof Object ? value : {}),
  );

describe('plan words', () => {
  it('names the three slots and labels the modelled path and the forecast as models', () => {
    expect(Object.values(PLAN.slots)).toEqual(['Morning', 'Afternoon', 'Evening']);
    expect(PLAN.modelled).toContain('Not a measurement.');
    expect(STRIP.about).toContain('A model forecast');
  });

  it('gives Hindi every English label, in Devanagari, with the same slots and no nukta on the plain letters', () => {
    const { en, hi } = PLAN_LABELS;
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
    expect(flat(hi).every((text) => /\p{Script=Devanagari}/u.test(text))).toBe(true);
    expect(flat(hi).some((text) => /[क़-फ़]|[कखगजफ]़/u.test(text))).toBe(false);
    const slotted: readonly ('from' | 'movedTo' | 'minutes')[] = ['from', 'movedTo', 'minutes'];
    for (const key of slotted) {
      expect(hi[key].match(/\{\w+\}/g)).toEqual(en[key].match(/\{\w+\}/g));
    }
  });
});
