// Tests for the footer: the data credits the licences ask for, and links only to views marked for the footer.
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../../../src/ui/components/Footer.js';
import { axeViolations, renderInApp } from '../helpers.js';

const Empty = (): ReactElement => <p>Privacy text</p>;

describe('Footer', () => {
  it('credits CPCB, Open-Meteo and GeoNames and says samples are made up', async () => {
    const { container } = renderInApp(<Footer links={[]} />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('Central Pollution Control Board CAAQMS feed');
    expect(footer).toHaveTextContent('Weather data by Open-Meteo.com, CC BY 4.0.');
    expect(footer).toHaveTextContent('GeoNames (geonames.org), CC BY 4.0.');
    expect(footer).toHaveTextContent('Sample households are made up.');
    expect(screen.getByRole('link', { name: 'Open-Meteo.com' })).toHaveAttribute(
      'href',
      'https://open-meteo.com/',
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('lists the footer views as links', () => {
    renderInApp(<Footer links={[{ id: 'privacy', title: 'Privacy', Component: Empty, footer: true }]} />);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '?view=privacy');
  });
});
