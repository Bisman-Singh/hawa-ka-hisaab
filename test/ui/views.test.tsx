// Tests for the view registry: ids and titles in page order, only the first screen comes with the page, every other
// view loads on demand with the heading its title names, and the plain pages are listed in the footer.
import { screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { HomeView } from '../../src/ui/place/HomeView.js';
import { VIEWS } from '../../src/ui/views.js';
import { renderInApp } from './helpers.js';
import { stubApi } from './plan/fixtures.js';

beforeEach(() => {
  window.localStorage.clear();
});

describe('VIEWS', () => {
  it('lists each view once, in page order, with the plain pages in the footer', () => {
    expect(VIEWS.map((view) => [view.id, view.title, view.footer ?? false])).toEqual([
      ['home', "Today's air for your place", false],
      ['household', 'Your household', false],
      ['plan', "Today's plan", false],
      ['indoor', 'Indoor air and swaps', false],
      ['compare', 'Two households, the same air', false],
      ['community', 'Society or school', false],
      ['privacy', 'Privacy', true],
      ['about-data', 'About the data', true],
    ]);
    expect(VIEWS[0]?.Component).toBe(HomeView);
  });

  it('loads every other view on demand with the heading its title names', async () => {
    stubApi({});
    for (const view of VIEWS.slice(1)) {
      const { unmount } = renderInApp(
        <Suspense fallback={<p>Loading</p>}>
          <view.Component />
        </Suspense>,
        view.id === 'household' ? null : undefined,
      );
      expect(await screen.findByRole('heading', { level: 1, name: view.title })).toBeInTheDocument();
      unmount();
    }
  });
});
