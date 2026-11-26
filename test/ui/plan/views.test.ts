// Tests for the plan, compare, community and ask view list.
import { describe, expect, it } from 'vitest';
import { PLAN_VIEWS } from '../../../src/ui/plan/views.js';

describe('PLAN_VIEWS', () => {
  it('names each view once and leaves the home id to the place screens', () => {
    const ids = PLAN_VIEWS.map((view) => view.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('home');
  });
});
