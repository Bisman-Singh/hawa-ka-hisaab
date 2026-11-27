// Tests for the privacy page: what is sent where, Google's terms linked, the host's logs, the model switch, the clear
// control, the contact line with and without an address, and axe on the page.
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ContactLine, PrivacyView } from '../../../src/ui/legal/PrivacyView.js';
import { GEMINI_TERMS_URL, PRIVACY } from '../../../src/ui/legal/strings.js';
import { CONSENT } from '../../../src/ui/consent/strings.js';
import { axeViolations, renderInApp } from '../helpers.js';
import { saveSample } from '../plan/fixtures.js';

afterEach(() => {
  window.localStorage.clear();
});

describe('PrivacyView', () => {
  it('states what is sent and kept, links the terms, and holds the model switch and the clear control', async () => {
    saveSample();
    const { container } = renderInApp(<PrivacyView />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
    for (const title of [
      PRIVACY.sent,
      PRIVACY.google,
      PRIVACY.kept,
      PRIVACY.model,
      PRIVACY.clear,
      PRIVACY.contact,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: PRIVACY.googleLink })).toHaveAttribute('href', GEMINI_TERMS_URL);
    expect(screen.getByText(/Vercel, keeps request logs/)).toBeInTheDocument();
    expect(screen.getByText(CONSENT.state.on)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: PRIVACY.clearButton })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);
});

describe('ContactLine', () => {
  it('links the issue page once its address is set, and names it in words until then', () => {
    const { rerender } = render(<ContactLine url={null} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/open an issue on the app's code repository\./)).toBeInTheDocument();
    rerender(<ContactLine url="https://example.org/issues" />);
    expect(screen.getByRole('link', { name: PRIVACY.contactLink })).toHaveAttribute(
      'href',
      'https://example.org/issues',
    );
  });
});
