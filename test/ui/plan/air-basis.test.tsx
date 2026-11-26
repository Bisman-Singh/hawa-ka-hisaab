// Tests for the air basis line: the station reading when it is the one the plan used, the data.gov.in rule, the
// modelled label, and nothing when the page holds another reading or none.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StationReading } from '../../../src/features/air/types.js';
import { AirBasisLine, airQuote, istClock } from '../../../src/ui/plan/air-basis.js';
import { airResponse, planResponse, READING_HOUR, stationReading } from './fixtures.js';

const basis = planResponse('family-car-asthma', 'very_poor').airBasis;

describe('AirBasisLine', () => {
  it('states the station reading the plan used, with its hour in IST and its source', () => {
    const { container } = render(<AirBasisLine basis={basis} air={airResponse()} />);
    expect(container).toHaveTextContent(
      'AQI 342 at JNU, Delhi - DPCC, reading for 22:00 IST. Source: CAAQMS hourly air quality index feed.',
    );
  });

  it('adds the AQI rule on the data.gov.in path, and gives the modelled label on the modelled path', () => {
    const reading: StationReading = { ...stationReading('very_poor'), provider: 'data_gov_in' };
    const air = { ...airResponse(), reading };
    const { container, rerender } = render(<AirBasisLine basis={basis} air={air} />);
    expect(container).toHaveTextContent(airQuote('data-gov-in-aqi-rule'));
    rerender(<AirBasisLine basis={{ ...basis, path: 'modelled' }} air={null} />);
    expect(container).toHaveTextContent('Modelled estimate from CAMS via Open-Meteo. Not a measurement.');
  });

  it('says nothing when the page holds no reading or another hour', () => {
    const { container, rerender } = render(<AirBasisLine basis={basis} air={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(
      <AirBasisLine basis={{ ...basis, readingHour: '2026-11-24T21:00:00+05:30' }} air={airResponse()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('helpers', () => {
  it('give the IST clock of an instant and the text of an air quote, empty for an unknown id', () => {
    expect(istClock(READING_HOUR)).toBe('22:00');
    expect(istClock('2026-11-24T00:30:00Z')).toBe('06:00');
    expect(airQuote('credit-open-meteo')).toBe('Weather data by Open-Meteo.com');
    expect(airQuote('grap-stage-order')).toBe('');
  });
});
