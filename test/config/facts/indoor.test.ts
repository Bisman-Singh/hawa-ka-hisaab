// Tests for the indoor facts: purifier sizing, the unit conversion and the smoke source findings.
import { describe, expect, it } from 'vitest';
import { INDOOR_FACTS } from '../../../src/config/facts/indoor.js';

describe('indoor facts', () => {
  it('size purifiers by the EPA table and convert cfm with the NIST factor', () => {
    const rate = INDOOR_FACTS.find((fact) => fact.id === 'purifier-cadr-per-area');
    const unit = INDOOR_FACTS.find((fact) => fact.id === 'unit-cfm-m3h');
    expect(rate?.kind === 'number' && rate.value).toBe(65);
    expect(unit?.kind === 'number' && unit.value).toBeCloseTo(0.0004719474 * 3600, 4);
  });

  it('quotes the coil, plant and purifier findings', () => {
    const quotes = INDOOR_FACTS.flatMap((fact) => (fact.kind === 'text' ? [fact.text] : [])).join('\n');
    expect(quotes).toContain('75-137 cigarettes');
    expect(quotes).toContain('10-1000 plants/m2');
    expect(quotes).toContain('not a replacement for public action');
  });
});
