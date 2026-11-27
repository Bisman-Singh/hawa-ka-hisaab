// Tests for the air basis line: the station reading when it is the one the plan used, the data.gov.in rule, the
// modelled label, and nothing when the page holds another reading or none.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { factQuote } from '../../../src/config/facts/index.js';
import type { AirResponse, StationReading } from '../../../src/features/air/types.js';
import { AirBasisLine, istClock, otherAir } from '../../../src/ui/plan/air-basis.js';
import { modelledReading } from '../place/air-fixtures.js';
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
    expect(container).toHaveTextContent(factQuote('naqi-worst-sub-index'));
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
  it('give the IST clock of an instant', () => {
    expect(istClock(READING_HOUR)).toBe('22:00');
    expect(istClock('2026-11-24T00:30:00Z')).toBe('06:00');
  });
});

describe('otherAir', () => {
  it('is true only when the air held on the page is not the reading the plan was made on', () => {
    expect(otherAir(null, basis)).toBe(false);
    expect(otherAir(airResponse(), basis)).toBe(false);
    expect(otherAir(airResponse(), { ...basis, readingHour: '2026-11-24T21:00:00+05:30' })).toBe(true);
    expect(otherAir(airResponse(), { ...basis, path: 'modelled' })).toBe(true);
    const modelled: AirResponse = { ...airResponse(), reading: modelledReading() };
    expect(otherAir(modelled, { ...basis, path: 'modelled', readingHour: READING_HOUR })).toBe(false);
    const none: AirResponse = {
      ...airResponse(),
      reading: { path: 'unavailable', reason: 'feed_and_model_down' },
    };
    expect(otherAir(none, { ...basis, path: 'unavailable', readingHour: null })).toBe(false);
  });
});
