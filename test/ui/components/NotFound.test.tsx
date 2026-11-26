// Tests for the not-found view: a heading, a quiet message and a link back to the first screen.
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NOT_FOUND } from '../../../src/ui/components/NotFound.js';
import { axeViolations, renderInApp } from '../helpers.js';

describe('NOT_FOUND', () => {
  it('says the address names no page and links to the start', async () => {
    const View = NOT_FOUND.Component;
    const { container } = renderInApp(<View />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('There is no page at this address.');
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute('href', './');
    expect(await axeViolations(container)).toEqual([]);
  });
});
