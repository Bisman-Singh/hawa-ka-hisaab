// Tests for the mask facts: ranges kept as ranges and the children's study described as it is.
import { describe, expect, it } from 'vitest';
import { MASK_FACTS } from '../../../src/config/facts/masks.js';

describe('mask facts', () => {
  it('keep the N95 filtration and the leakage as ranges', () => {
    const n95 = MASK_FACTS.find((fact) => fact.id === 'mask-n95-filtered');
    const leak = MASK_FACTS.find((fact) => fact.id === 'mask-leakage');
    expect(n95?.kind === 'number' && n95.range).toEqual({ low: 0.97, high: 0.98 });
    expect(leak?.kind === 'number' && leak.range).toEqual({ low: 0.03, high: 0.68 });
  });

  it('say who was tested and keep the cut in the leakage quote marked', () => {
    const find = (id: string) => MASK_FACTS.find((fact) => fact.id === id);
    expect(find('mask-n95-filtered')?.title).toMatch(/N95 and CaN99 together/);
    expect(find('mask-leakage')?.title).toMatch(/black carbon.*4 mask types.*at rest/);
    const quote = find('mask-leakage-quote');
    expect(quote?.kind === 'text' && quote.text).toContain(
      'under both test conditions. [...] Many commercially',
    );
  });

  it('say the children study looked at wearability only', () => {
    const children = MASK_FACTS.find((fact) => fact.id === 'mask-children-quote');
    expect(children?.kind === 'text' && children.text).toContain('wearability');
  });
});
