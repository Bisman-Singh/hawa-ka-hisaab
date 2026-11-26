// Tests for the masthead: decorative mark, wordmark home link with its Hindi part marked, and the IST date.
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../../src/config/app.js';
import { Masthead } from '../../../src/ui/components/Masthead.js';
import { axeViolations, renderInApp } from '../helpers.js';

describe('Masthead', () => {
  it('links the wordmark home and shows the day in India', async () => {
    const { container } = renderInApp(<Masthead now={new Date('2026-11-25T20:00:00Z')} />);
    const home = screen.getByRole('link', { name: `हवा का हिसाब ${APP_NAME}, the account of the air` });
    expect(home).toHaveAttribute('href', './');
    expect(screen.getByText('हवा का हिसाब')).toHaveAttribute('lang', 'hi');
    expect(screen.getByRole('banner')).toHaveTextContent('Thursday26 Nov 2026');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(await axeViolations(container)).toEqual([]);
  });
});
