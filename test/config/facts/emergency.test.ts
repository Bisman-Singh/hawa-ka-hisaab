// Tests for the emergency number fact: the number the fixed reply states and the official sentence behind it.
import { describe, expect, it } from 'vitest';
import { EMERGENCY_FACTS } from '../../../src/config/facts/emergency.js';
import { factSchema } from '../../../src/lib/schemas/facts.js';

describe('EMERGENCY_FACTS', () => {
  it('holds 112 with the government release that states it', () => {
    expect(EMERGENCY_FACTS.every((fact) => factSchema.safeParse(fact).success)).toBe(true);
    const [number, quote] = EMERGENCY_FACTS;
    expect(number).toMatchObject({ kind: 'number', id: 'india-emergency-number', value: 112 });
    expect(quote?.kind === 'text' && quote.text).toContain('single emergency number – 112');
    expect(number?.source.url).toBe('https://www.pib.gov.in/PressReleasePage.aspx?PRID=2116557');
  });
});
