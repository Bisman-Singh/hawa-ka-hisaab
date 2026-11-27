// Tests for the source line: each provider worded as the facts say, with its hour, links and licence.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { factQuote, findFact } from '../../../src/config/facts/index.js';
import { ModelledSource, providerWords, StationSource } from '../../../src/ui/place/SourceLine.js';
import { jnuReading, modelledReading } from './air-fixtures.js';

describe('source line', () => {
  it('names the CPCB feed, the hour, and that the AQI is as CPCB published it', () => {
    const { container } = render(<StationSource reading={jnuReading()} />);
    expect(container.textContent).toBe(
      'Source: CAAQMS hourly air quality index feed, Central Pollution Control Board, reading for 22:00 IST on 24 Nov. The AQI is shown as CPCB published it.',
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://airquality.cpcb.gov.in/caaqms/rss_feed',
    );
  });

  it('words the data.gov.in path with the rule from the facts and links its licence', () => {
    expect(providerWords('data_gov_in')).toEqual({
      after: factQuote('naqi-worst-sub-index'),
      licence: findFact('credit-data-gov-in')?.source,
    });
    render(<StationSource reading={jnuReading({ provider: 'data_gov_in' })} />);
    expect(screen.getByText(/The worst sub-index determines the overall AQI\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Government Open Data License India/ })).toBeInTheDocument();
  });

  it('treats a reading saved before provider existed as the CPCB feed', () => {
    const { provider, ...old } = jnuReading();
    expect(provider).toBe('cpcb_feed');
    const { container } = render(<StationSource reading={old} />);
    expect(container.textContent).toContain('The AQI is shown as CPCB published it.');
  });

  it('credits Open-Meteo on the modelled path as a link with its licence, and says how the index is found', () => {
    const { container } = render(<ModelledSource reading={modelledReading()} />);
    expect(container.textContent).toBe(
      "Source: Air Quality API, CAMS global model, Open-Meteo, hours up to 22:00 IST. The index is worked out from these means with CPCB's NAQI table. Weather data by Open-Meteo.com, CC BY 4.0.",
    );
    const credit = screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' });
    expect(credit).toHaveAttribute('href', findFact('credit-open-meteo')?.source.url);
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });
});
