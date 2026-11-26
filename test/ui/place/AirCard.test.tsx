// Tests for the air card: loading, a failed request, each reading path, GRAP only when sent, and the summary.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AirResponse, GrapNotice } from '../../../src/features/air/types.js';
import type { Query, RequestState } from '../../../src/ui/data/request.js';
import { AirCard, airSummary } from '../../../src/ui/place/AirCard.js';
import { axeViolations } from '../helpers.js';
import { airResponse, jnuReading, modelledReading } from './air-fixtures.js';

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

describe('airSummary', () => {
  it('says the AQI and band, the estimate, or why there is none, in one sentence', () => {
    expect(airSummary(airResponse())).toBe('CPCB AQI 246, Poor.');
    expect(airSummary(airResponse({ reading: jnuReading({ aqi: null }) }))).toBe(
      'CPCB published no AQI for this station this hour.',
    );
    expect(airSummary(airResponse({ reading: modelledReading() }))).toBe(
      'Modelled estimate 61, Satisfactory.',
    );
    const thin = modelledReading({
      estimate: { status: 'insufficient', reason: 'too_few_pollutants', available: [] },
    });
    expect(airSummary(airResponse({ reading: thin }))).toBe(
      'The model gave too few pollutants for an index, so none is shown.',
    );
    expect(airSummary(airResponse({ reading: { path: 'unavailable', reason: 'feed_and_model_down' } }))).toBe(
      'The air reading could not be fetched.',
    );
  });
});
