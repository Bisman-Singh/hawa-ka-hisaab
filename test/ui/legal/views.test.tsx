// Tests for the plain page views: privacy and about the data, both in the footer and both loaded on demand.
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { LEGAL_VIEWS } from '../../../src/ui/legal/views.js';
import { renderInApp } from '../helpers.js';

describe('LEGAL_VIEWS', () => {
  it('lists privacy and about the data for the footer and loads each on demand', async () => {
    expect(LEGAL_VIEWS.map((view) => [view.id, view.title, view.footer])).toEqual([
      ['privacy', 'Privacy', true],
      ['about-data', 'About the data', true],
    ]);
    for (const view of LEGAL_VIEWS) {
      const { Component } = view;
      const { unmount } = renderInApp(
        <Suspense fallback={<p>Loading</p>}>
          <Component />
        </Suspense>,
      );
      expect(await screen.findByRole('heading', { level: 1, name: view.title })).toBeInTheDocument();
      unmount();
    }
    expect(render(<p />).container).toBeInTheDocument();
  });
});
