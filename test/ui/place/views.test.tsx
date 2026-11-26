// Tests for the place and household view list: ids, titles, and the household view loaded on demand.
import { screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { HomeView } from '../../../src/ui/place/HomeView.js';
import { PLACE_VIEWS } from '../../../src/ui/place/views.js';
import { renderInApp } from '../helpers.js';

describe('PLACE_VIEWS', () => {
  it('names each view once, and only the first screen may take the home id', () => {
    const ids = PLACE_VIEWS.map((view) => view.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'home').length).toBeLessThanOrEqual(1);
  });

  it('shows the home view at once and loads the household view on demand', async () => {
    expect(PLACE_VIEWS.map((view) => [view.id, view.title])).toEqual([
      ['home', "Today's air for your place"],
      ['household', 'Your household'],
    ]);
    expect(PLACE_VIEWS[0]?.Component).toBe(HomeView);
    const Household = PLACE_VIEWS[1]?.Component ?? HomeView;
    renderInApp(
      <Suspense fallback={<p>Loading</p>}>
        <Household />
      </Suspense>,
      null,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Your household' })).toBeInTheDocument();
  });
});
