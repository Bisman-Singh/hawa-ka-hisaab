// Tests for the station figures: no main pollutant line without one, and a station with no hourly values.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StationAqi, SubIndices } from '../../../src/ui/place/station-parts.js';
import { jnuReading } from './air-fixtures.js';

describe('station figures', () => {
  it('leaves out the main pollutant line when CPCB named none, and marks an old hour', () => {
    const reading = jnuReading({ aqi: { value: 246, band: 'poor', predominant: null } });
    render(<StationAqi reading={reading} at="22:00" />);
    expect(screen.queryByText(/Main pollutant/)).toBeNull();
    expect(screen.getByText('CPCB AQI at 22:00')).toBeInTheDocument();
    expect(screen.getByText('AQI 246 is in the fourth of six bands, Poor, 201 to 300.')).toBeInTheDocument();
  });

  it('words the data.gov.in path when the rule gives no AQI', () => {
    render(<StationAqi reading={jnuReading({ aqi: null, provider: 'data_gov_in' })} at={null} />);
    expect(screen.getByText('No AQI for this station this hour.')).toBeInTheDocument();
    expect(screen.getByText(/at least three pollutants, one of them PM2.5 or PM10/)).toBeInTheDocument();
  });

  it('says so when the station has no hourly sub-index, and marks no main row without an AQI', () => {
    const empty = jnuReading({
      pollutants: [{ pollutant: 'pm25', hourlySubIndex: null, avg: 10, min: 5, max: 20 }],
    });
    const { container, rerender } = render(<SubIndices reading={empty} />);
    expect(screen.getByText('CPCB published no hourly sub-index for this station.')).toBeInTheDocument();
    expect(container.querySelectorAll('dt')).toHaveLength(0);
    rerender(<SubIndices reading={jnuReading({ aqi: null })} />);
    expect(container.querySelector('.main')).toBeNull();
  });
});
