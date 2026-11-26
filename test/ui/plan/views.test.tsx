// Tests for the plan, indoor, compare and community view list: ids, titles, and that each lazy view loads.
import { screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PLAN_VIEWS } from '../../../src/ui/plan/views.js';
import { renderInApp } from '../helpers.js';
import { stubApi } from './fixtures.js';

beforeEach(() => {
  window.localStorage.clear();
});

describe('PLAN_VIEWS', () => {
  it('names each view once and leaves the home id to the place screens', () => {
    const ids = PLAN_VIEWS.map((view) => view.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('home');
    expect(ids).toEqual(['plan', 'indoor', 'compare', 'community']);
  });

  it('loads every view on demand with the heading its title names', async () => {
    stubApi({});
    for (const view of PLAN_VIEWS) {
      const { unmount } = renderInApp(
        <Suspense fallback={<p>Loading</p>}>
          <view.Component />
        </Suspense>,
      );
      expect(await screen.findByRole('heading', { level: 1, name: view.title })).toBeInTheDocument();
      unmount();
    }
  });
});
