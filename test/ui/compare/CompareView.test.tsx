// Tests for compare: two plan requests for the same place, rows marked as differing or the same with the reason
// from the planner's comparePlans, the different-air case, a failure with a retry, and the states before it.
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import { comparePlans } from '../../../src/features/planner/compare.js';
import { planRequestSchema } from '../../../src/features/planner/contract.js';
import type { PlanResponse } from '../../../src/features/planner/types.js';
import { CompareView } from '../../../src/ui/compare/CompareView.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { sample } from '../../support/plan-fixtures.js';
import { axeViolations, renderInApp } from '../helpers.js';
import {
  airResponse,
  announced,
  json,
  planResponse,
  saveSample,
  sentBody,
  stubApi,
} from '../plan/fixtures.js';

const OTHER = 'older-couple-chulha';
const renderCompare = () =>
  renderInApp(
    <Announcer>
      <CompareView />
    </Announcer>,
  );

function planFor(body: unknown, other: PlanResponse): Response {
  const { household } = planRequestSchema.parse(body);
  const mine = JSON.stringify(household) === JSON.stringify(sample('family-car-asthma'));
  return json(mine ? planResponse('family-car-asthma', 'poor') : other);
}

async function compareWithOther(): Promise<void> {
  const index = SAMPLE_HOUSEHOLDS.findIndex((found) => found.id === OTHER);
  await userEvent.selectOptions(screen.getByLabelText('Compare with'), String(index));
  await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('CompareView', () => {
  it('marks each row as differing or the same with the reason, from comparePlans on two real plans', async () => {
    saveSample();
    const other = planResponse(OTHER, 'poor');
    const fetcher = stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': (body) => planFor(body, other),
    });
    const { container } = renderCompare();
    await compareWithOther();
    expect(await screen.findByRole('heading', { name: 'Sample household' })).toBeInTheDocument();
    const expected = comparePlans(
      { household: sample('family-car-asthma'), ...planResponse('family-car-asthma', 'poor') },
      { household: sample(OTHER), ...other },
    );
    const differences = expected.ok ? expected.value : [];
    expect(differences.length).toBeGreaterThan(0);
    const rows = container.querySelectorAll('ol.cmp > li');
    expect(rows).toHaveLength(6);
    expect(container.querySelectorAll('.differs')).toHaveLength(differences.length);
    expect(container.querySelectorAll('.same')).toHaveLength(6 - differences.length);
    const first = differences[0];
    expect(screen.getAllByText(first?.left ?? '')).not.toHaveLength(0);
    expect(announced()).toBe('The comparison is ready.');
    const bodies = [0, 1].map((index) => planRequestSchema.parse(sentBody(fetcher, index)));
    expect(bodies.map((body) => body.location)).toEqual([bodies[0]?.location, bodies[0]?.location]);
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('says the plans cannot be compared when they were made on different air, and compares again', async () => {
    saveSample();
    const shifted = planResponse(OTHER, 'poor');
    const other = { ...shifted, airBasis: { ...shifted.airBasis, readingHour: '2026-11-24T23:00:00+05:30' } };
    const fetcher = stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': (body) => planFor(body, other),
    });
    renderCompare();
    await compareWithOther();
    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: 'The two plans were made on different air' }),
    ).toBeInTheDocument();
    await userEvent.click(within(alert).getByRole('button', { name: 'Compare again' }));
    await waitFor(() => {
      expect(fetcher.mock.calls.filter(([url]) => url === '/api/plan')).toHaveLength(4);
    });
  });

  it('shows a failed request with a retry, the waiting line, and clears the result when the sample changes', async () => {
    saveSample();
    let calls = 0;
    stubApi({
      '/api/plan': (body) => {
        calls += 1;
        return calls <= 2 ? json({}, 500) : planFor(body, planResponse(OTHER, 'poor'));
      },
    });
    renderCompare();
    await compareWithOther();
    expect(
      await screen.findByRole('heading', { name: 'The server did not answer properly' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Sample household' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Compare with'), '0');
    expect(screen.queryByRole('heading', { name: 'Sample household' })).toBeNull();
    stubApi({ '/api/plan': () => new Promise<Response>(() => undefined) });
    await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByText('Making both plans')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled();
  });

  it('asks for a place and then a household first', () => {
    stubApi({});
    const first = renderCompare();
    expect(screen.getByRole('link', { name: 'Set your place' })).toBeInTheDocument();
    first.unmount();
    window.localStorage.setItem(
      'saved-state',
      JSON.stringify({
        version: 1,
        household: null,
        location: { lat: 28.54, lon: 77.17 },
        place: null,
        language: 'en',
      }),
    );
    renderCompare();
    expect(screen.getByRole('link', { name: 'Describe your household' })).toBeInTheDocument();
  });
});
