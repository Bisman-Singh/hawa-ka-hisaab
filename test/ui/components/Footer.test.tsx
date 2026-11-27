// Tests for the footer: the data credits the licences ask for, and links only to views marked for the footer.
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { factQuote } from '../../../src/config/facts/index.js';
import { Footer } from '../../../src/ui/components/Footer.js';
import { LICENCES } from '../../../src/ui/components/Credit.js';
import { UI } from '../../../src/ui/i18n/strings.js';
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
    expect(screen.getAllByRole('link', { name: 'CC BY 4.0' })).toHaveLength(2);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('words the Open-Meteo credit and its licence as the facts registry does', () => {
    const { meteoBefore, meteoLink, licenceUrl } = UI.credits;
    expect(`${meteoBefore.slice(meteoBefore.indexOf('Weather data by'))}${meteoLink}`).toBe(
      factQuote('credit-open-meteo'),
    );
    expect(LICENCES['credit-open-meteo']?.url).toBe(licenceUrl);
  });

  it('lists the footer views as links', () => {
    renderInApp(<Footer links={[{ id: 'privacy', title: 'Privacy', Component: Empty, footer: true }]} />);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '?view=privacy');
  });
});
