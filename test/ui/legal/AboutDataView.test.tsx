// Tests for the about-the-data page: each credit from the registry as a link with its licence, the dated data.gov.in
// credit with the licence linked, every cited source listed, measured and modelled, 112, samples, and axe.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dataGovInCredit } from '../../../src/config/facts/air.js';
import { factQuote, findFact } from '../../../src/config/facts/index.js';
import { AboutDataView, DataGovCredit, SourceItem } from '../../../src/ui/legal/AboutDataView.js';
import { citedSources } from '../../../src/ui/legal/sources.js';
import { ABOUT } from '../../../src/ui/legal/words.js';
import { axeViolations, renderInApp } from '../helpers.js';

const words = (id: string): string =>
  factQuote(id)
    .replace(/\.$/, '')
    .replace(/, CC BY 4\.0$/, '');

describe('AboutDataView', () => {
  it('credits each source in the registry words, as links, with licences, and lists every cited source', async () => {
    const { container } = renderInApp(<AboutDataView />);
    expect(screen.getByRole('heading', { level: 1, name: 'About the data' })).toBeInTheDocument();
    for (const id of ['credit-cpcb', 'credit-open-meteo', 'credit-cams', 'credit-geonames']) {
      expect(screen.getByRole('link', { name: words(id) })).toHaveAttribute('href', findFact(id)?.source.url);
    }
    expect(screen.getAllByRole('link', { name: 'CC BY 4.0' })).toHaveLength(3);
    expect(container.querySelectorAll('ul.cite li')).toHaveLength(citedSources().length);
    expect(screen.getByText(/The worst sub-index determines the overall AQI\./)).toBeInTheDocument();
    expect(screen.getByText(/It is not medical advice/)).toHaveTextContent('call 112.');
    expect(screen.getByText(ABOUT.samplesText)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('dates the data.gov.in credit and links its licence from the registry', () => {
    const { container } = render(<DataGovCredit today="2026-11-24T10:00:00Z" />);
    expect(container).toHaveTextContent(dataGovInCredit('2026-11-24T10:00:00Z'));
    expect(container).toHaveTextContent(/Open Government Data Platform India, 24\/11,/);
    expect(screen.getByRole('link')).toHaveAttribute('href', findFact('credit-data-gov-in')?.source.url);
  });

  it('lists a source with or without a publication date', () => {
    const source = {
      title: 'T',
      publisher: 'P',
      url: 'https://example.org/t',
      published: null,
      retrieved: '2026-11-27',
    };
    const { container, rerender } = render(<SourceItem source={source} />);
    expect(container).toHaveTextContent('T, P.');
    rerender(<SourceItem source={{ ...source, published: '2015' }} />);
    expect(container).toHaveTextContent('T, P, 2015.');
  });
});
