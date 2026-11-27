// Tests for the plan view: every state, the what-if recompute with the planner's own function, the severe-day
// bulletin, the mild day, Hindi text, model text as text, the sheet, and axe on each state.
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { effectDisplay } from '../../../src/features/ledger/display.js';
import { whatIfEffects } from '../../../src/features/planner/what-if.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { PlanView } from '../../../src/ui/plan/PlanView.js';
import { contextFor } from '../../../src/ui/plan/plan-data.js';
import { peopleLine } from '../../../src/ui/plan/plan-words.js';
import { sample } from '../../support/plan-fixtures.js';
import { axeViolations, fakeDialog, renderInApp } from '../helpers.js';
import { airResponse, announced, json, need, planResponse, saveSample, stubApi } from './fixtures.js';

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
    const bus = within(entryOf('Office commute: take the bus'));
    const co2 = effectDisplay(need(swap.effects.find((effect) => effect.kind === 'co2')));
    expect(bus.getByText(co2.headline)).toHaveClass('fig');
    expect(bus.getByText(co2.detail)).toHaveClass('range');
    const air = effectDisplay(need(swap.effects.find((effect) => effect.kind === 'exposure')));
    expect(air.direction).toBe('mixed');
    expect(bus.getByText('Up to 2.4× as much')).toHaveClass('fig');
    expect(bus.getByText(/^or 8% less/)).toHaveClass('range');
    expect(bus.queryByText(need(air.note))).toBeNull();
    expect(bus.getByText(need(swap.tradeOff))).toBeInTheDocument();
    expect(announced()).toBe('Your plan is ready.');
    const aside = within(screen.getByRole('complementary', { name: 'This account' }));
    expect(aside.getByText(peopleLine(sample('family-car-asthma').members))).toBeInTheDocument();
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
    const ctx = contextFor(response.plan, sample('family-car-asthma'), need(response.whatIfContext));
    const expected = whatIfEffects(ctx, toggle.patch);
    const co2 = need(expected.ok ? expected.value.find((effect) => effect.kind === 'co2') : undefined);
    const { headline, sentence } = effectDisplay(co2);
    expect(within(entry).queryByText(headline)).toBeNull();
    await userEvent.click(within(entry).getByRole('radio', { name: 'Share the ride with one more person' }));
    expect(within(entry).getByText(headline)).toBeInTheDocument();
    expect(announced()).toContain(`Share the ride with one more person. ${sentence}`);
    await userEvent.click(within(entry).getByRole('radio', { name: 'As planned' }));
    expect(within(entry).queryByText(headline)).toBeNull();
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
    const entry = entryOf('Walk in the park: go at 14:00 instead of 07:00');
    expect(within(entry).getByText('from 07:00')).toBeInTheDocument();
    const toggles = response.plan.slots.afternoon.flatMap((item) => item.whatIfs);
    const toggle = need(toggles.find((found) => found.id === 'start-a3-1300'));
    const expected = whatIfEffects(
      contextFor(response.plan, sample('family-car-asthma'), need(response.whatIfContext)),
      toggle.patch,
    );
    const exposure = need(
      expected.ok ? expected.value.find((effect) => effect.kind === 'exposure') : undefined,
    );
    const text = effectDisplay(exposure).headline;
    expect(within(entry).queryByText(text)).toBeNull();
    await userEvent.click(within(entry).getByRole('radio', { name: 'Start at 13:00' }));
    expect(within(entry).getByText(text)).toBeInTheDocument();
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
    const plan = need(container.querySelector<HTMLElement>('.page-right'));
    expect(within(plan).getAllByText(/AQI/)).toHaveLength(1);
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
      await screen.findByText(
        'The air is good today. Most things are fine as they are, so the day can go ahead as planned.',
      ),
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
    const head = need(document.querySelector<HTMLElement>('.plan-head'));
    expect(within(head).getByText(/CPCB published no AQI for this station/)).toBeInTheDocument();
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
