// Tests for the air card: loading, a failed request, each reading path, GRAP only when sent, and the summary.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AirResponse, GrapNotice } from '../../../src/features/air/types.js';
import type { Query, RequestState } from '../../../src/ui/data/request.js';
import { AirCard } from '../../../src/ui/place/AirCard.js';
import { axeViolations } from '../helpers.js';
import { airResponse, modelledReading } from './air-fixtures.js';

const query = (state: RequestState<AirResponse>, retry = vi.fn()): Query<AirResponse> => ({ state, retry });
const done = (data: AirResponse) => query({ status: 'done', data });
const GRAP: GrapNotice = {
  region: 'delhi_ncr',
  stage: 'II',
  orderDate: '2026-11-17',
  factId: 'grap-stage-order',
};

describe('AirCard', () => {
  it('shows a skeleton with a sentence while the air is read', async () => {
    const { container } = render(<AirCard air={query({ status: 'loading' })} where="PIN 110092" />);
    expect(screen.getByText('Reading the air for PIN 110092')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    render(<AirCard air={query({ status: 'idle' })} where="Lucknow" />);
    expect(screen.getByText('Reading the air for Lucknow')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('shows a failed request with a retry', async () => {
    const retry = vi.fn();
    render(
      <AirCard air={query({ status: 'failed', failure: { kind: 'network' } }, retry)} where="Lucknow" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No connection');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('adds the GRAP note dated by its order only when the response carries one', () => {
    const { container, rerender } = render(<AirCard air={done(airResponse())} where="PIN 110067" />);
    expect(container.querySelector('.grap')).toBeNull();
    rerender(<AirCard air={done(airResponse({ grap: GRAP }))} where="PIN 110067" />);
    expect(container.querySelector('.grap')?.textContent).toBe(
      'GRAP, Delhi NCR only. Stages I and II are in force, by CAQM order dated 17 Nov 2026.',
    );
    rerender(<AirCard air={done(airResponse({ reading: modelledReading(), grap: GRAP }))} where="Delhi" />);
    expect(container.querySelector('.modelled .grap')).not.toBeNull();
  });

  it('gives the short card beside the plan the AQI, band, source and GRAP note without the detail', () => {
    const { container, rerender } = render(
      <AirCard air={done(airResponse({ grap: GRAP }))} where="PIN 110067" compact />,
    );
    expect(screen.getByText('246')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
    expect(container.querySelector('.source')).not.toBeNull();
    expect(container.querySelector('.grap')).not.toBeNull();
    expect(container.querySelector('.scale')).toBeNull();
    expect(container.querySelector('.subidx')).toBeNull();
    rerender(<AirCard air={done(airResponse({ reading: modelledReading() }))} where="Delhi" compact />);
    expect(screen.getByText('61')).toBeInTheDocument();
    expect(container.querySelector('.scale')).toBeNull();
    expect(container.querySelector('.subidx')).toBeNull();
  });

  it('says plainly when neither the feed nor the model answered, with a retry', async () => {
    const retry = vi.fn();
    const data = airResponse({ reading: { path: 'unavailable', reason: 'no_station_and_model_down' } });
    render(<AirCard air={{ state: { status: 'done', data }, retry }} where="Leh" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No CPCB station is within 50 km, and the model did not answer.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
