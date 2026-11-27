// Tests for the modelled slip: labelled as an estimate, never a reading, with why it is used and its means.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FeedStatus, ModelledReading } from '../../../src/features/air/types.js';
import { ModelledSlip } from '../../../src/ui/place/ModelledSlip.js';
import { axeViolations } from '../helpers.js';
import { computedEstimate, FRESH_FEED, modelledReading } from './air-fixtures.js';

const slip = (reading: ModelledReading, retry = vi.fn(), feed: FeedStatus = FRESH_FEED) =>
  render(
    <ModelledSlip reading={reading} feed={feed} where="Gopeshwar, Chamoli, Uttarakhand" retry={retry} />,
  );

describe('ModelledSlip', () => {
  it('is dashed, says it is a model estimate and not a measurement, and shows the means with units', async () => {
    const { container } = slip(modelledReading());
    expect(container.querySelector('.slip')).toHaveClass('modelled');
    expect(
      screen.getByRole('article', { name: 'Modelled estimate Gopeshwar, Chamoli, Uttarakhand' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Modelled estimate from CAMS via Open-Meteo. Not a measurement. It tends to read low in cities.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('No CPCB station within 50 km. The nearest is 107 km away.')).toBeInTheDocument();
    expect(container.querySelector('.aqi .fig')?.textContent).toBe('61');
    expect([...container.querySelectorAll('.subidx dd')].map((value) => value.textContent)).toEqual([
      '24.1 µg/m³',
      '61.0 µg/m³',
      '0.21 mg/m³',
    ]);
    expect(container.querySelector('dt.main')?.textContent).toBe('PM10, leads the estimate');
    expect(container.textContent).not.toMatch(/live|measured/i);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('reads a severe estimate as 401 or more', () => {
    slip(modelledReading({ estimate: computedEstimate({ value: 401, band: 'severe' }) }));
    expect(screen.getByText('meaning 401 or more')).toBeInTheDocument();
  });

  it('shows no index when the model gave too few pollutants', () => {
    const { container } = slip(
      modelledReading({ estimate: { status: 'insufficient', reason: 'no_particulate', available: ['no2'] } }),
    );
    expect(container.querySelector('.aqi')).toBeNull();
    expect(
      screen.getByText('The model gave too few pollutants for an index, so none is shown.'),
    ).toBeInTheDocument();
  });

  it('offers a retry when the feed did not answer, and capitalises a device location', async () => {
    const retry = vi.fn();
    render(
      <ModelledSlip
        reading={modelledReading({ reason: 'feed_unavailable' })}
        feed={{ fetch: 'failed', feedHour: null, stale: false, problem: 'busy' }}
        where="your location"
        retry={retry}
      />,
    );
    expect(screen.getByText('Your location')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The station data source is busy. Try again in a minute. No earlier reading is saved for this place.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('names an ozone sub-index that is the highest hour, not a mean', () => {
    const base = computedEstimate();
    const estimate = computedEstimate({
      subIndices: [
        ...base.subIndices,
        { pollutant: 'o3', subIndex: 120, meanConcentration: 210.4, unit: 'ug_m3', averagingHours: 1 },
      ],
    });
    const { container } = slip(modelledReading({ estimate }));
    const names = [...container.querySelectorAll('.subidx dt')].map((term) => term.textContent);
    expect(names).toEqual(['PM2.5', 'PM10, leads the estimate', 'CO', 'Ozone, highest hour of the last 8']);
  });

  it('keeps the plain pollutant name when ozone is an 8 hour mean', () => {
    const base = computedEstimate();
    const estimate = computedEstimate({
      subIndices: [
        ...base.subIndices,
        { pollutant: 'o3', subIndex: 50, meanConcentration: 90, unit: 'ug_m3', averagingHours: 8 },
      ],
    });
    const { container } = slip(modelledReading({ estimate }));
    expect([...container.querySelectorAll('.subidx dt')].map((term) => term.textContent)).toContain('Ozone');
  });
});
