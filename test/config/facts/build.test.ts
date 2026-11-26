// Tests for the fact builders.
import { describe, expect, it } from 'vitest';
import { numberFact, quoteFact } from '../../../src/config/facts/build.js';
import { factSchema } from '../../../src/lib/schemas/facts.js';
import { sampleSource } from '../../support/samples.js';

describe('fact builders', () => {
  it('build a number fact with and without a range, and an English quote', () => {
    const spec = { id: 'test-number', title: 'A number', value: 2, unit: 'units' };
    expect(numberFact(spec, sampleSource())).toMatchObject({ kind: 'number', range: null });
    expect(numberFact(spec, sampleSource(), { low: 2, high: 3 })).toMatchObject({
      range: { low: 2, high: 3 },
    });
    const quote = quoteFact({ id: 'test-quote', title: 'A quote', text: 'Words.' }, sampleSource());
    expect(quote).toMatchObject({ kind: 'text', lang: 'en' });
    expect(factSchema.safeParse(quote).success).toBe(true);
  });
});
