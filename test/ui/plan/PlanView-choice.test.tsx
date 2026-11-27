// Tests for the plan view and the model choice: no plan request before the choice, the plan made here from the air
// alone with the model off and labelled so, the ask box pointing to the switch, and turning the model on.
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONSENT } from '../../../src/ui/consent/strings.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { IndoorView } from '../../../src/ui/indoor/IndoorView.js';
import { PlanView } from '../../../src/ui/plan/PlanView.js';
import { loadState } from '../../../src/ui/storage.js';
import { axeViolations, fakeDialog, renderInApp } from '../helpers.js';
import { airResponse, json, planResponse, saveSample, stubApi } from './fixtures.js';

const renderPlan = () =>
  renderInApp(
    <Announcer>
      <PlanView />
    </Announcer>,
  );

const calls = (fetcher: ReturnType<typeof stubApi>): string[] =>
  fetcher.mock.calls.map(([url]) => url.split('?')[0] ?? '');

beforeEach(() => {
  window.localStorage.clear();
  fakeDialog();
});

describe('PlanView and the model choice', () => {
  it('asks before anything goes to the model, and asks the plan route only once the model is chosen', async () => {
    saveSample('family-car-asthma', 'en', null);
    const fetcher = stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    const { container } = renderPlan();
    expect(await screen.findByRole('heading', { name: CONSENT.title })).toBeInTheDocument();
    expect(screen.getByText(CONSENT.offPlan)).toBeInTheDocument();
    expect(calls(fetcher)).not.toContain('/api/plan');
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: CONSENT.use }));
    expect(await screen.findByText('Walk in the park: go at 14:00 instead of 07:00')).toBeInTheDocument();
    expect(calls(fetcher)).toContain('/api/plan');
  }, 30_000);

  it('with the model off makes the plan here from the air alone, labels it and offers the switch for questions', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    const fetcher = stubApi({ '/api/air': () => json(airResponse('poor')) });
    renderPlan();
    expect(await screen.findByText(CONSENT.madeHere)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: "Today's plan" })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: 'Morning' })).toHaveLength(1);
    expect(calls(fetcher)).toEqual(['/api/air']);
    const ask = screen.getByRole('region', { name: 'Ask about today' });
    expect(within(ask).getByText(CONSENT.offAsk)).toBeInTheDocument();
    expect(within(ask).queryByRole('textbox')).toBeNull();
    await userEvent.click(within(ask).getByRole('button', { name: CONSENT.turnOn }));
    expect(loadState(window.localStorage).modelChoice).toBe('on');
  });

  it('with the model off the indoor view uses the plan made here too', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    const fetcher = stubApi({ '/api/air': () => json(airResponse('poor')) });
    renderInApp(<IndoorView />);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Instead of this, do that' }),
    ).toBeInTheDocument();
    expect(calls(fetcher)).toEqual(['/api/air']);
  });

  it('turns the model on from the note above a plan made here', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    stubApi({
      '/api/air': () => json(airResponse('poor')),
      '/api/plan': () => json(planResponse('family-car-asthma', 'poor')),
    });
    renderPlan();
    await screen.findByText(CONSENT.madeHere);
    const note = screen.getByText(CONSENT.madeHere).closest('div') ?? document.body;
    await userEvent.click(within(note).getByRole('button', { name: CONSENT.turnOn }));
    expect(await screen.findByRole('region', { name: 'Ask about today' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: /Your question/ })).toBeInTheDocument();
  });

  it('with the model off shows the air failure with a retry when the air cannot be read', async () => {
    saveSample('family-car-asthma', 'en', 'off');
    stubApi({ '/api/air': () => json({ error: { code: 'internal', message: 'No.', issues: [] } }, 500) });
    renderPlan();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
