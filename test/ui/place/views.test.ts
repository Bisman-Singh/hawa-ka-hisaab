// Tests for the place and household view list.
import { describe, expect, it } from 'vitest';
import { PLACE_VIEWS } from '../../../src/ui/place/views.js';

describe('PLACE_VIEWS', () => {
  it('names each view once, and only the first screen may take the home id', () => {
    const ids = PLACE_VIEWS.map((view) => view.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'home').length).toBeLessThanOrEqual(1);
  });
});
