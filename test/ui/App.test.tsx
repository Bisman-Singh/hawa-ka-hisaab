// Tests for the app root: state, router and frame together, and a browser that blocks storage.
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { App, browserStorage } from '../../src/ui/App.js';
import { ViewHeading } from '../../src/ui/components/Navigation.js';
import { useAppState } from '../../src/ui/state/app-state.js';

function Home(): ReactElement {
  const { language } = useAppState();
  return <ViewHeading>Home in {language}</ViewHeading>;
}

describe('App', () => {
  it('renders the frame and the registered view with the shared state', () => {
    render(<App views={[{ id: 'home', title: 'Home', Component: Home }]} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Home in en' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('falls back to the registry, which shows the not-found view while it has no home', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('gives null when the browser blocks local storage', () => {
    expect(browserStorage()).toBe(window.localStorage);
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(browserStorage()).toBeNull();
  });
});
