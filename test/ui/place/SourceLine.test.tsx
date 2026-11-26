// Tests for the source line: each provider worded as the facts say, with its hour, links and licence.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AIR_FACTS } from '../../../src/config/facts/air.js';
import { ModelledSource, PROVIDER_WORDS, StationSource } from '../../../src/ui/place/SourceLine.js';
import { jnuReading, modelledReading } from './air-fixtures.js';

const ruleText = AIR_FACTS.find((fact) => fact.id === 'data-gov-in-aqi-rule');

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
    expect(ruleText?.kind === 'text' ? ruleText.text : null).toBe(PROVIDER_WORDS.data_gov_in.after);
    render(<StationSource reading={jnuReading({ provider: 'data_gov_in' })} />);
    expect(screen.getByText(/AQI is the highest sub-index, CPCB's own rule\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Government Open Data License India/ })).toBeInTheDocument();
  });

  it('treats a reading saved before provider existed as the CPCB feed', () => {
    const { provider, ...old } = jnuReading();
    expect(provider).toBe('cpcb_feed');
    const { container } = render(<StationSource reading={old} />);
    expect(container.textContent).toContain('The AQI is shown as CPCB published it.');
  });

  it('credits Open-Meteo on the modelled path and says how the index is found', () => {
    const { container } = render(<ModelledSource reading={modelledReading()} />);
    expect(container.textContent).toBe(
      "Source: Air Quality API, CAMS global model, Open-Meteo, hours up to 22:00 IST. The index is worked out from these means with CPCB's NAQI table. Weather data by Open-Meteo.com.",
    );
  });
});
