// Tests for the plan view: every state, the what-if recompute with the planner's own function, the severe-day
// bulletin, the mild day, Hindi text, model text as text, the sheet, and axe on each state.
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { describeChange, formatEffect } from '../../../src/features/ledger/format.js';
import { whatIfEffects } from '../../../src/features/planner/what-if.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { PlanView } from '../../../src/ui/plan/PlanView.js';
import { contextFor } from '../../../src/ui/plan/plan-data.js';
import { sample } from '../../support/plan-fixtures.js';
import { axeViolations, fakeDialog, renderInApp } from '../helpers.js';
import {
  airResponse,
  announced,
  FORECAST,
  json,
  need,
  planResponse,
  saveSample,
  stubApi,
} from './fixtures.js';

const renderPlan = () =>
  renderInApp(
    <Announcer>
      <PlanView />
    </Announcer>,
  );

function entryOf(title: string): HTMLElement {
  const found = screen.getByRole('heading', { name: title }).closest('li');
  if (found === null) {
    throw new Error(`no entry ${title}`);
  }
  return found;
}

beforeEach(() => {
  window.localStorage.clear();
  fakeDialog();
});

describe('PlanView with a plan', () => {
  it('shows the real plan in three slots with sums worded by the ledger, and passes axe', async () => {
    saveSample();
    const response = planResponse('family-car-asthma', 'poor');
    stubApi({ '/api/air': () => json(airResponse('poor')), '/api/plan': () => json(response) });
    const { container } = renderPlan();
    expect(await screen.findByText(response.plan.headline)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: "Today's plan" })).toBeInTheDocument();
    for (const slot of ['Morning', 'Afternoon', 'Evening']) {
      expect(screen.getByRole('heading', { level: 2, name: slot })).toBeInTheDocument();
    }
    const swap = need(response.plan.slots.morning.find((item) => item.candidateId === 'swap-a1'));
    const co2 = need(swap.effects.find((effect) => effect.kind === 'co2'));
    expect(within(entryOf('Office commute: take the bus')).getByText(formatEffect(co2))).toBeInTheDocument();
    expect(announced()).toBe('Your plan is ready.');
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('recomputes a travel toggle at once with the planner whatIfEffects and announces it', async () => {
    saveSample();
    const response = planResponse('family-car-asthma', 'poor');
    stubApi({ '/api/air': () => json(airResponse('poor')), '/api/plan': () => json(response) });
    renderPlan();
    await screen.findByText('Office commute: take the bus');
    const entry = entryOf('Office commute: take the bus');
    const toggles = response.plan.slots.morning.flatMap((item) => item.whatIfs);
    const toggle = need(toggles.find((found) => found.id === 'carpool-a1'));
    const ctx = contextFor(response.plan, sample('family-car-asthma'), FORECAST);
    const expected = whatIfEffects(ctx, toggle.patch);
    const co2 = need(expected.ok ? expected.value.find((effect) => effect.kind === 'co2') : undefined);
    const text = formatEffect(co2);
    expect(within(entry).queryByText(text)).toBeNull();
    await userEvent.click(within(entry).getByRole('radio', { name: 'Share the ride with one more person' }));
    expect(within(entry).getByText(text)).toBeInTheDocument();
    expect(announced()).toContain(`Share the ride with one more person. Travel CO₂: ${text}`);
    await userEvent.click(within(entry).getByRole('radio', { name: 'As planned' }));
    expect(within(entry).queryByText(text)).toBeNull();
    expect(announced()).toContain('As planned.');
  });

  it('strikes a moved activity through at its usual time and recomputes other start times on the forecast', async () => {
    saveSample();
    const response = planResponse('family-car-asthma', 'poor');
    stubApi({ '/api/air': () => json(airResponse('poor')), '/api/plan': () => json(response) });
    renderPlan();
    await screen.findByText('Walk in the park');
    const moved = entryOf('Walk in the park');
    expect(moved).toHaveClass('moved');
    expect(within(moved).getByText('Moved to 14:00')).toBeInTheDocument();
    const entry = entryOf('Move walk in the park to 14:00');
    expect(within(entry).getByText('from 07:00')).toBeInTheDocument();
    const toggles = response.plan.slots.afternoon.flatMap((item) => item.whatIfs);
    const toggle = need(toggles.find((found) => found.id === 'start-a3-1300'));
    const expected = whatIfEffects(
      contextFor(response.plan, sample('family-car-asthma'), FORECAST),
      toggle.patch,
    );
    const exposure = need(
      expected.ok ? expected.value.find((effect) => effect.kind === 'exposure') : undefined,
    );
    const text = describeChange(exposure.change);
    expect(within(entry).queryByText(text)).toBeNull();
    await userEvent.click(within(entry).getByRole('radio', { name: 'Start at 13:00' }));
    expect(within(entry).getByText(text)).toBeInTheDocument();
  });

  it('hides start-time toggles and says why when the page has no forecast', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse('poor', null)),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    await screen.findByText('Move walk in the park to 14:00');
    const entry = entryOf('Move walk in the park to 14:00');
    expect(within(entry).queryByRole('radio', { name: 'Start at 13:00' })).toBeNull();
    expect(within(entry).getByText(/Other start times need the forecast/)).toBeInTheDocument();
    expect(screen.getByText(/forecast is not loaded on this page/)).toBeInTheDocument();
  });

  it('puts the severe-day bulletin first, with the health ministry words for everyone and the vulnerable', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse()),
      '/api/plan': () => json(planResponse('family-car-asthma', 'very_poor')),
    });
    const { container } = renderPlan();
    const bulletin = await screen.findByRole('note');
    expect(within(bulletin).getByRole('heading', { name: 'Very Poor air today' })).toBeInTheDocument();
    expect(bulletin).toHaveTextContent('Remain indoors and keep activity levels low');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(bulletin.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bulletin).toHaveTextContent('AQI 342 at JNU, Delhi - DPCC');
    expect(screen.getAllByText(/AQI/)).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('on a mild day says items need no change and invents no restriction', async () => {
    saveSample('students-cycle');
    stubApi({
      '/api/air': () => json(airResponse('good')),
      '/api/plan': () => json(planResponse('students-cycle', 'good')),
    });
    renderPlan();
    expect(
      await screen.findByText('The air is good today. Most things are fine as they are.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('None needed.')).toHaveLength(2);
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.queryByText(/^Move /)).toBeNull();
    expect(screen.getByText('Nothing to change today, so nothing to add up.')).toBeInTheDocument();
  });

  it('says the band is unknown when the plan has none', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse(null)),
      '/api/plan': () => json(planResponse('family-car-asthma', null)),
    });
    renderPlan();
    expect(await screen.findByText(/air reading for your place is not available today/)).toBeInTheDocument();
    expect(screen.getByText(/CPCB published no AQI for this station/)).toBeInTheDocument();
  });

  it('shows model text as text, never as HTML', async () => {
    saveSample();
    const response = planResponse('family-car-asthma', 'poor');
    const first = need(response.plan.slots.morning[0]);
    const hostile = {
      ...response,
      plan: {
        ...response.plan,
        slots: { ...response.plan.slots, morning: [{ ...first, title: '<img src=x onerror=alert(1)>' }] },
      },
    };
    stubApi({ '/api/air': () => json(airResponse('poor')), '/api/plan': () => json(hostile) });
    const { container } = renderPlan();
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
