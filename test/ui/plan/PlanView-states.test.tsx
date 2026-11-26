// Tests for the plan view states: the rules plan when the model is down, Hindi, missing place or household,
// loading, failure with retry, offline and no forecast, with axe where a state is new.
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { PlanView } from '../../../src/ui/plan/PlanView.js';
import { axeViolations, fakeDialog, renderInApp } from '../helpers.js';
import {
  airResponse,
  hindiPlanResponse,
  json,
  planResponse,
  rulesTrace,
  savePlaceOnly,
  saveSample,
  stubApi,
  sentBody,
} from './fixtures.js';

const renderPlan = () =>
  renderInApp(
    <Announcer>
      <PlanView />
    </Announcer>,
  );

beforeEach(() => {
  window.localStorage.clear();
  fakeDialog();
});

describe('PlanView when the model did not word the plan', () => {
  it('labels the rules plan, says why, and asks the model again on request', async () => {
    saveSample();
    const fetcher = stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor', { trace: rulesTrace('quota') })),
    });
    const { container } = renderPlan();
    expect(
      await screen.findByRole('heading', { name: 'The model is not answering right now' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Wording by fixed rules')).not.toHaveLength(0);
    expect(screen.getByText(/used up its free quota/)).toBeInTheDocument();
    expect(screen.getByText('Move walk in the park to 14:00')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Try the model again' }));
    await waitFor(() => {
      expect(fetcher.mock.calls.filter(([url]) => url === '/api/plan')).toHaveLength(2);
    });
  }, 30_000);

  it('does not offer to try again when no model key is set', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    expect(await screen.findByRole('heading', { name: 'This plan uses fixed wording' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try the model again' })).toBeNull();
  });
});

describe('PlanView in Hindi', () => {
  it('marks the worded text lang="hi", keeps code text English, and asks again in a new language', async () => {
    saveSample('family-car-asthma', 'hi');
    const fetcher = stubApi({
      '/api/air': () => json(airResponse()),
      '/api/plan': () => json(hindiPlanResponse('family-car-asthma', 'very_poor')),
    });
    renderPlan();
    expect(await screen.findByText('आज हवा बहुत ख़राब है।')).toHaveAttribute('lang', 'hi');
    expect(screen.getAllByText('आज की योजना का कदम')[0]).toHaveAttribute('lang', 'hi');
    expect(screen.getByText('Wording by Gemini')).toBeInTheDocument();
    expect(screen.getByText(/Every number in the wording matched a fact/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'English' }));
    await waitFor(() => {
      expect(fetcher.mock.calls.filter(([url]) => url === '/api/plan')).toHaveLength(2);
    });
    const body = sentBody(fetcher, -1);
    expect(body).toMatchObject({ language: 'en' });
  });

  it('says why a plan asked for in Hindi came back in English', async () => {
    saveSample('family-car-asthma', 'hi');
    stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    expect(await screen.findByText(/Hindi wording needs the model/)).toBeInTheDocument();
  });
});

describe('PlanView before a plan', () => {
  it('sends the reader to the place or household view when one is missing', async () => {
    stubApi({});
    const first = renderPlan();
    expect(screen.getByRole('link', { name: 'Set your place' })).toHaveAttribute('href', './');
    expect(await axeViolations(first.container)).toEqual([]);
    first.unmount();
    savePlaceOnly();
    renderPlan();
    expect(screen.getByRole('link', { name: 'Describe your household' })).toHaveAttribute(
      'href',
      '?view=household',
    );
  }, 30_000);

  it('shows the loading steps and skeleton while the plan is made', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse()),
      '/api/plan': () => new Promise<Response>(() => undefined),
    });
    const { container } = renderPlan();
    expect(screen.getByText('Making your plan')).toBeInTheDocument();
    expect(await screen.findByText('Work out the figures in code, then word the steps')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('shows a failed request with a retry that asks again', async () => {
    saveSample();
    let calls = 0;
    stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => {
        calls += 1;
        return calls === 1 ? json({}, 500) : json(planResponse('family-car-asthma', 'poor'));
      },
    });
    renderPlan();
    expect(
      await screen.findByRole('heading', { name: 'The server did not answer properly' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Move walk in the park to 14:00')).toBeInTheDocument();
  });

  it('says the plan on the page is the last one when the browser goes offline', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    await screen.findByText('Move walk in the park to 14:00');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('You are offline. This is the last plan made on this page.')).toBeInTheDocument();
  });

  it('says there was no forecast when the plan was made without one', async () => {
    saveSample();
    stubApi({
      '/api/air': () => json(airResponse('poor', null)),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor', { curve: null })),
    });
    renderPlan();
    expect(await screen.findByText(/No forecast was available for your place today/)).toBeInTheDocument();
  });
});
