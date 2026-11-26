// Tests for the frame: landmarks and skip link, the view for the address, the page title, lazy and failing
// views, the offline notice and footer links.
import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { lazy } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_NAME } from '../../../src/config/app.js';
import { AppShell } from '../../../src/ui/components/AppShell.js';
import { ViewHeading } from '../../../src/ui/components/Navigation.js';
import type { ViewDef } from '../../../src/ui/view-types.js';
import { renderInApp } from '../helpers.js';

const now = new Date('2026-11-26T01:10:00Z');

function Home(): ReactElement {
  return <ViewHeading>{"Today's air for your place"}</ViewHeading>;
}

function Broken(): ReactElement {
  throw new Error('view failed');
}

let finishLoading: (view: { default: () => ReactElement }) => void = () => undefined;
const Compare = lazy(
  () =>
    new Promise<{ default: () => ReactElement }>((resolve) => {
      finishLoading = resolve;
    }),
);

const views: readonly ViewDef[] = [
  { id: 'home', title: "Today's air for your place", Component: Home },
  { id: 'broken', title: 'Broken', Component: Broken },
  { id: 'compare', title: 'Compare', Component: Compare },
  { id: 'privacy', title: 'Privacy', Component: Home, footer: true },
];

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('AppShell', () => {
  it('frames the home view with landmarks, a skip link first and the page title', async () => {
    renderInApp(<AppShell views={views} now={now} />);
    expect(screen.getByRole('banner')).toHaveTextContent('Thursday');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('heading', { level: 1, name: "Today's air for your place" })).toBeInTheDocument();
    expect(document.title).toBe(`Today's air for your place. ${APP_NAME}`);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Sample households are made up.');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '?view=privacy');
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });

  it('shows the not-found view for an unknown address', () => {
    window.history.replaceState(null, '', '/?view=nowhere');
    renderInApp(<AppShell views={views} now={now} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(document.title).toBe(`Page not found. ${APP_NAME}`);
  });

  it('keeps the frame when a view fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.replaceState(null, '', '/?view=broken');
    renderInApp(<AppShell views={views} now={now} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This part of the page stopped working.');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('says it is loading while a lazy view arrives', async () => {
    window.history.replaceState(null, '', '/?view=compare');
    renderInApp(<AppShell views={views} now={now} />);
    expect(screen.getByText('Loading this page')).toBeInTheDocument();
    await act(async () => {
      finishLoading({ default: () => <ViewHeading>Two households, the same air</ViewHeading> });
      await Promise.resolve();
    });
    expect(await screen.findByRole('heading', { name: 'Two households, the same air' })).toBeInTheDocument();
  });

  it('says so when the browser is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderInApp(<AppShell views={views} now={now} />);
    expect(screen.getByRole('heading', { level: 2, name: 'You are offline' })).toBeInTheDocument();
  });
});
