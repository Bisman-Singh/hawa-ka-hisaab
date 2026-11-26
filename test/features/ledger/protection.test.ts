// Tests for mask and light pace protection.
import { describe, expect, it } from 'vitest';
import type { Member } from '../../../src/features/household/types.js';
import { lightPaceEffect, maskEffect } from '../../../src/features/ledger/protection.js';

const adult: Member = { id: 'm1', ageGroup: 'adult', flags: [] };
const child: Member = { id: 'm2', ageGroup: 'child', flags: ['asthma_or_lung'] };

describe('maskEffect', () => {
  it('spans a well worn N95 to a leaky fit, for adults only', () => {
    const effect = maskEffect([adult, child]);
    expect(effect?.kind === 'exposure' && effect.change.low).toBeCloseTo(-0.98, 10);
    expect(effect?.kind === 'exposure' && effect.change.high).toBeCloseTo(-0.32, 10);
    expect(effect?.kind === 'exposure' && effect.memberIds).toEqual(['m1']);
  });

  it('gives no figure for children, since no study measured it', () => {
    expect(maskEffect([child])).toBeNull();
  });
});

describe('lightPaceEffect', () => {
  it('uses the adult rates for adults and the child rates for children', () => {
    const grown = lightPaceEffect([adult]);
    expect(grown?.kind === 'exposure' && grown.change.low).toBeCloseTo(12 / 50 - 1, 10);
    expect(grown?.kind === 'exposure' && grown.change.high).toBeCloseTo(12 / 26 - 1, 10);
    const both = lightPaceEffect([adult, child]);
    expect(both?.kind === 'exposure' && both.change.high).toBeCloseTo(11 / 22 - 1, 10);
    expect(both?.working.factIds).toHaveLength(6);
  });

  it('is null with no members', () => {
    expect(lightPaceEffect([])).toBeNull();
  });
});
