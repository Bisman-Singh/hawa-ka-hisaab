// Tests for the station slip: CPCB's AQI as published, never worked out, the sub-index label, and old readings.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FeedStatus, StationReading } from '../../../src/features/air/types.js';
import { StationSlip } from '../../../src/ui/place/StationSlip.js';
import { axeViolations } from '../helpers.js';
import { jnuReading } from './air-fixtures.js';

const FRESH: FeedStatus = { fetch: 'ok', feedHour: '2026-11-24T22:00:00+05:30', stale: false };

const slip = (reading: StationReading, feed = FRESH, retry = vi.fn()) =>
  render(<StationSlip reading={reading} feed={feed} where="PIN 110067" retry={retry} />);

describe('StationSlip', () => {
  it('shows the AQI CPCB published, its band and main pollutant, and labels sub-indices as not the AQI', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-24T22:40:00+05:30'));
    const { container } = slip(jnuReading({ aqi: { value: 246, band: 'poor', predominant: 'pm25' } }));
    expect(container.querySelector('.slip')).not.toHaveClass('dim');
    expect(screen.getByText('Station reading')).toBeInTheDocument();
    expect(screen.getByText('CPCB AQI')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('.aqi .fig')?.textContent).toBe('246');
    expect(screen.getByText('JNU, Delhi - DPCC')).toBeInTheDocument();
    expect(container.querySelector('.meta')?.textContent).toBe(
      'Delhi. 2.1 km from PIN 110067. Reading for 22:00 IST on 24 Nov.',
    );
    expect(screen.getByText('CPCB hourly sub-index, not the AQI.')).toBeInTheDocument();
    const rows = [...container.querySelectorAll('.subidx dt')].map((term) => term.textContent);
    expect(rows).toEqual(['PM2.5, main pollutant', 'PM10']);
    expect(container.querySelector('.source')?.textContent).toContain(
      'The AQI is shown as CPCB published it.',
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it('never shows a figure when CPCB published no AQI, and says so in words', () => {
    const { container } = slip(jnuReading({ aqi: null }));
    expect(container.querySelector('.aqi')).toBeNull();
    expect(screen.getByText('CPCB published no AQI for this station this hour.')).toBeInTheDocument();
    expect(container.textContent).not.toContain('246');
  });

  it('marks a stale reading with its hour and age', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-25T02:40:00+05:30'));
    const { container } = slip(jnuReading({ stale: true }));
    expect(container.querySelector('.slip')).toHaveClass('dim');
    expect(screen.getByRole('heading', { name: 'This reading is stale' })).toBeInTheDocument();
    expect(screen.getByText(/4 hours 40 minutes ago/)).toBeInTheDocument();
    expect(screen.getByText('CPCB AQI at 22:00')).toBeInTheDocument();
  });

  it('works out staleness again from the hour, so an old copy marked fresh still reads as stale', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-25T03:00:00+05:30'));
    slip(jnuReading({ stale: false }));
    expect(screen.getByRole('heading', { name: 'This reading is stale' })).toBeInTheDocument();
  });

  it('keeps the last good reading when the feed did not answer, with a retry', async () => {
    const retry = vi.fn();
    slip(jnuReading(), { fetch: 'failed', feedHour: '2026-11-24T22:00:00+05:30', stale: false }, retry);
    expect(screen.getByRole('heading', { name: 'The CPCB feed did not answer' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
