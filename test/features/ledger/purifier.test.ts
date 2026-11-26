// Tests for purifier sizing from the EPA table.
import { describe, expect, it } from 'vitest';
import { purifierCovers, purifierNeed } from '../../../src/features/ledger/purifier.js';

describe('purifierNeed', () => {
  it('matches the EPA table in cfm and converts to m³ per hour', () => {
    for (const [area, cfm] of [
      [100, 65],
      [200, 130],
      [300, 195],
    ]) {
      expect(purifierNeed(area ?? 0).value).toBeCloseTo((cfm ?? 0) * 1.69901, 6);
    }
    expect(purifierNeed(140).working.inputs.map((input) => input.value)).toEqual([140, 65, 1.69901]);
  });

  it('says whether a purifier covers the room', () => {
    const need = purifierNeed(140);
    expect(purifierCovers(250, need)).toBe(true);
    expect(purifierCovers(100, need)).toBe(false);
  });
});
