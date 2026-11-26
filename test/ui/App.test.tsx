// Tests for the app root.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config/app.js';
import { App } from '../../src/ui/App.js';

describe('App', () => {
  it('renders the shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
