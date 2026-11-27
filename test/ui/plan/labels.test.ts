// Tests for the plan labels: Hindi has every label English has, each written in Devanagari, spelt as the plan
// text tables spell it, and the templates keep their {time} and {count} slots.
import { describe, expect, it } from 'vitest';
import { PLAN_LABELS } from '../../../src/ui/plan/labels.js';

const flat = (labels: object): string[] =>
  Object.values(labels).flatMap((value: unknown) =>
    typeof value === 'string' ? [value] : flat(value instanceof Object ? value : {}),
  );

describe('plan labels', () => {
  it('gives Hindi every English label, in Devanagari, with the same slots and no nukta on the plain letters', () => {
    const { en, hi } = PLAN_LABELS;
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
    expect(flat(hi).every((text) => /\p{Script=Devanagari}/u.test(text))).toBe(true);
    expect(flat(hi).some((text) => /[\u0958-\u095e]|[कखगजफ]\u093c/u.test(text))).toBe(false);
    const slotted: readonly ('from' | 'movedTo' | 'minutes')[] = ['from', 'movedTo', 'minutes'];
    for (const key of slotted) {
      expect(hi[key].match(/\{\w+\}/g)).toEqual(en[key].match(/\{\w+\}/g));
    }
  });
});
