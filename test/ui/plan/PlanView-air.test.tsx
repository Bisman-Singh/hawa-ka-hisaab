// Tests for the plan view's air: what-ifs recompute on the curve and time the server planned with, never the page's
// own forecast, and the short air card on the left page, with a note when it holds another reading.
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { effectDisplay } from '../../../src/features/ledger/display.js';
import { whatIfEffects } from '../../../src/features/planner/what-if.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { PlanView } from '../../../src/ui/plan/PlanView.js';
import { contextFor } from '../../../src/ui/plan/plan-data.js';
import { hourCurve } from '../../support/fake-air.js';
import { flatDay, sample } from '../../support/plan-fixtures.js';
import { fakeDialog, renderInApp } from '../helpers.js';
import {
  airResponse,
  FORECAST,
  json,
  need,
  planResponse,
  saveSample,
  stationReading,
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

describe('PlanView and the air', () => {
  it('shows the air failure with a retry on the left page when the plan came but the air did not', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json({ error: { code: 'internal', message: 'No.', issues: [] } }, 500),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    const aside = await screen.findByRole('complementary', { name: 'This account' });
    expect(await within(aside).findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(within(aside).queryByText(/different reading/)).toBeNull();
  });

  it('recomputes start times on the curve and time the server planned with, never the forecast the page holds', async () => {
    saveSample();
    const response = planResponse('family-car-asthma', 'poor', { notBefore: '12:30' });
    const flat = hourCurve(flatDay(90), FORECAST.issuedAt);
    stubApi({ '/api/air': () => json(airResponse('poor', flat)), '/api/plan': () => json(response) });
    renderPlan();
    await screen.findByText('Walk in the park: go at 14:00 instead of 07:00');
    const entry = entryOf('Walk in the park: go at 14:00 instead of 07:00');
    const toggle = need(
      response.plan.slots.afternoon.flatMap((item) => item.whatIfs).find((w) => w.id === 'start-a3-1300'),
    );
    const household = sample('family-car-asthma');
    const served = whatIfEffects(
      contextFor(response.plan, household, need(response.whatIfContext)),
      toggle.patch,
    );
    const fromPage = whatIfEffects(
      contextFor(response.plan, household, { curve: flat, notBefore: null }),
      toggle.patch,
    );
    const texts = [served, fromPage].map((result) => {
      const exposure = need(
        result.ok ? result.value.find((effect) => effect.kind === 'exposure') : undefined,
      );
      return effectDisplay(exposure).headline;
    });
    expect(texts[0]).not.toBe(texts[1]);
    await userEvent.click(within(entry).getByRole('radio', { name: 'Start at 13:00' }));
    expect(within(entry).getByText(texts[0] ?? '')).toBeInTheDocument();
    expect(within(entry).queryByText(texts[1] ?? '')).toBeNull();
    expect(screen.getByText('planned at 12:30')).toBeInTheDocument();
  });

  it('hides start-time toggles and says why when a response came without the forecast it was made with', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor', { withContext: false })),
    });
    renderPlan();
    await screen.findByText('Walk in the park: go at 14:00 instead of 07:00');
    const entry = entryOf('Walk in the park: go at 14:00 instead of 07:00');
    expect(within(entry).queryByRole('radio', { name: 'Start at 13:00' })).toBeNull();
    expect(within(entry).getByText(/Other start times need the forecast/)).toBeInTheDocument();
    expect(screen.getByText(/came without the forecast it was made with/)).toBeInTheDocument();
  });

  it('shows the air card on the left page, short, beside the plan', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse('very_poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'very_poor')),
    });
    renderPlan();
    const aside = await screen.findByRole('complementary', { name: 'This account' });
    const card = await within(aside).findByRole('article', { name: /Station reading/ });
    expect(card).toHaveTextContent('342');
    expect(card).toHaveTextContent('Very Poor');
    expect(card.querySelector('.scale')).toBeNull();
    expect(within(aside).queryByText(/different reading/)).toBeNull();
  });

  it('says so when the air card holds a different reading from the one the plan used', async () => {
    saveSample();
    const later = {
      ...airResponse('poor'),
      reading: { ...stationReading('poor'), readingHour: '2026-11-24T23:00:00+05:30' },
    };
    stubApi({
      '/api/air': () => json(later),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    const aside = await screen.findByRole('complementary', { name: 'This account' });
    expect(
      await within(aside).findByText(
        'This card shows a different reading from the one this plan was made on.',
      ),
    ).toBeInTheDocument();
  });
});
