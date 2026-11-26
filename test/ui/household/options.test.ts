// Tests that the form offers exactly the household schema's values, so no option can fail the schema.
import { describe, expect, it } from 'vitest';
import {
  activityKindSchema,
  ageGroupSchema,
  cookingFuelSchema,
  fuelSchema,
  indoorSourceSchema,
  memberFlagSchema,
  travelModeSchema,
} from '../../../src/features/household/schemas.js';
import { OPTIONS } from '../../../src/ui/household/options.js';

const keys = (record: object): string[] => Object.keys(record);

describe('OPTIONS', () => {
  it('names every schema value and nothing else', () => {
    expect(keys(OPTIONS.age)).toEqual(ageGroupSchema.options);
    expect(keys(OPTIONS.flag)).toEqual(memberFlagSchema.options);
    expect(keys(OPTIONS.kind)).toEqual(activityKindSchema.options);
    expect(keys(OPTIONS.travel)).toEqual(['none', ...travelModeSchema.options]);
    expect(keys(OPTIONS.fuel)).toEqual(fuelSchema.options);
    expect(keys(OPTIONS.cooking)).toEqual(cookingFuelSchema.options);
    expect(keys(OPTIONS.source)).toEqual(indoorSourceSchema.options);
    expect(keys(OPTIONS.setting)).toEqual(['outdoor', 'indoor', 'in_transit']);
    expect(keys(OPTIONS.room)).toEqual(['bedroom', 'living', 'kitchen', 'study', 'other']);
  });
});
