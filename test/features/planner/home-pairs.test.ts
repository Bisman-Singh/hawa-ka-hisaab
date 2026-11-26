// Tests for the home pairs: cleaner cooking fuel and a coil alternative.
import { describe, expect, it } from 'vitest';
import type { Household } from '../../../src/features/household/types.js';
import { situationOf } from '../../../src/features/planner/context.js';
import { coilPair, fuelPair } from '../../../src/features/planner/home-pairs.js';
import { planContext, testHousehold } from '../../support/plan-fixtures.js';

const home = (
  cookingFuel: Household['home']['cookingFuel'],
  indoorSources: Household['home']['indoorSources'],
) =>
  situationOf(planContext({ ...testHousehold([]), home: { rooms: [], cookingFuel, indoorSources } }, 'good'));

describe('home pairs', () => {
  it('suggest gas or induction for a smoky fuel only', () => {
    expect(fuelPair(home('coal', [])).map((pair) => pair.instead)).toEqual(['cooking on coal']);
    expect(fuelPair(home('lpg', []))).toEqual([]);
  });

  it('suggest a net or a repellent that does not burn in place of a coil, citing the coil finding', () => {
    expect(coilPair(home('lpg', ['mosquito_coil']))[0]?.factIds).toContain('coil-cigarettes');
    expect(coilPair(home('lpg', ['incense']))).toEqual([]);
  });
});
