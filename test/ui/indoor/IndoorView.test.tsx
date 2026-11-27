// Tests for the indoor view: purifier sizing as a sum, home steps and corrected claims with their sources, swaps
// with figures where a factor backs them and the reason alone where none does, the states before a plan, and axe.
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { effectDisplay } from '../../../src/features/ledger/display.js';
import { formatFigure } from '../../../src/features/ledger/format.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { IndoorView } from '../../../src/ui/indoor/IndoorView.js';
import { axeViolations, renderInApp } from '../helpers.js';
import { airResponse, json, need, planResponse, saveSample, stubApi } from '../plan/fixtures.js';

const renderIndoor = () =>
  renderInApp(
    <Announcer>
      <IndoorView />
    </Announcer>,
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe('IndoorView', () => {
  it('works the purifier size as a sum and shows every step, claim and swap from the plan', async () => {
    saveSample();
    const response = planResponse('family-car-asthma', 'poor');
    stubApi({ '/api/air': () => json(airResponse('poor')), '/api/plan': () => json(response) });
    const { container } = renderIndoor();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Purifier size for the bedroom' }),
    ).toBeInTheDocument();
    const purifier = need(response.plan.indoor.find((step) => step.id === 'purifier-r1'));
    const total = formatFigure(need(purifier.figure));
    expect(container.querySelector('dl.calc .total')).toHaveTextContent(total);
    expect(container.querySelector('dl.calc .total')).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Houseplants will not clean smoky air' }).closest('li'),
    ).toHaveClass('myth');
    const myth = screen.getByRole('heading', { name: 'Houseplants will not clean smoky air' }).closest('li');
    expect(myth).not.toHaveTextContent('No measured figure');
    expect(screen.getAllByText('No measured figure for this step.')).not.toHaveLength(0);
    const swaps = within(need(container.querySelector('ol.swap')));
    expect(swaps.getAllByText('Reason only. There is no measured figure for this swap.')).toHaveLength(2);
    const priced = need(response.plan.alternatives.find((swap) => swap.effect !== null)?.effect);
    const shown = effectDisplay(priced);
    expect(swaps.getAllByText(shown.headline)).not.toHaveLength(0);
    expect(swaps.getAllByText(shown.detail)).not.toHaveLength(0);
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('says when a household has no swaps and no steps of a kind', async () => {
    saveSample('students-cycle');
    const response = planResponse('students-cycle', 'good');
    const trimmed = {
      ...response,
      plan: { ...response.plan, indoor: response.plan.indoor.filter((step) => step.topic === 'myth') },
    };
    stubApi({ '/api/air': () => json(airResponse('good')), '/api/plan': () => json(trimmed) });
    renderIndoor();
    expect(
      await screen.findByText('No swaps apply to the trips and habits in this household.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No steps of this kind for this home today.')).toBeInTheDocument();
  });

  it('sends the reader to set a place before there is a plan', () => {
    stubApi({});
    renderIndoor();
    expect(screen.getByRole('heading', { level: 1, name: 'Indoor air and swaps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set your place' })).toBeInTheDocument();
  });
});
