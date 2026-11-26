// Tests for the page frame: landmarks, the skip link, the name and the footer line.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../../src/config/app.js';
import { AppShell } from '../../../src/ui/components/AppShell.js';

describe('AppShell', () => {
  it('has banner, main and contentinfo landmarks with the name as the heading', () => {
    render(<AppShell />);
    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('heading', { level: 1, name: APP_NAME }),
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Sample households are made up.');
  });

  it('offers a skip link first in the tab order that targets main', async () => {
    render(<AppShell />);
    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('renders the views it is given inside main', () => {
    render(
      <AppShell>
        <p>Air card</p>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toHaveTextContent('Air card');
  });
});
