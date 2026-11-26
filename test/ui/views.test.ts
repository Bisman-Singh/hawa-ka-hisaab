// Tests for the view registry: ids are unique, every view has a title, and both screen lists are included.
import { describe, expect, it } from 'vitest';
import { PLACE_VIEWS } from '../../src/ui/place/views.js';
import { PLAN_VIEWS } from '../../src/ui/plan/views.js';
import { VIEWS } from '../../src/ui/views.js';

describe('VIEWS', () => {
  it('joins the place and plan lists in page order with unique ids and titles', () => {
    expect(VIEWS).toEqual([...PLACE_VIEWS, ...PLAN_VIEWS]);
    expect(new Set(VIEWS.map((view) => view.id)).size).toBe(VIEWS.length);
    expect(VIEWS.every((view) => view.title.trim() !== '' && /^[a-z][a-z-]*$/.test(view.id))).toBe(true);
  });
});
