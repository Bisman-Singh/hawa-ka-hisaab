// Tests for the indoor words: a swap or step with no cited figure says so instead of showing a number.
import { describe, expect, it } from 'vitest';
import { INDOOR } from '../../../src/ui/indoor/words.js';

describe('INDOOR', () => {
  it('says plainly when there is no measured figure', () => {
    expect(INDOOR.reasonOnly).toBe('Reason only. There is no measured figure for this swap.');
    expect(INDOOR.noFigure).toBe('No measured figure for this step.');
  });
});
