// Tests for the shared state: it loads and saves the kept fields, clears what a change makes stale, and forgets.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AirResponse } from '../../../src/features/air/types.js';
import type { PlanResponse } from '../../../src/features/planner/types.js';
import { AppStateProvider, applySave, useAppActions, useAppState } from '../../../src/ui/state/app-state.js';
import type { AppState } from '../../../src/ui/state/app-state.js';
import { loadState, saveState, STORAGE_KEY } from '../../../src/ui/storage.js';
import { samplePlan, sampleTrace, sampleHousehold } from '../../support/samples.js';

const delhi = { lat: 28.65, lon: 77.31 };
const reading: AirResponse = {
  reading: { path: 'unavailable', reason: 'feed_and_model_down' },
  feed: { fetch: 'failed', feedHour: null, stale: false },
  forecast: null,
  grap: null,
};
const plan: PlanResponse = {
  plan: samplePlan(),
  airBasis: { path: 'station', band: 'poor', readingHour: null, forecastIssuedAt: null },
  trace: sampleTrace(),
};
const start: AppState = {
  household: sampleHousehold(),
  location: delhi,
  place: null,
  language: 'en',
  modelChoice: 'on',
  reading,
  plan,
  kept: true,
};

function Panel(): ReactElement {
  const state = useAppState();
  const { save, setReading, setPlan, forget } = useAppActions();
  return (
    <>
      <p>
        {state.location === null ? 'no place' : `at ${String(state.location.lat)}`},{' '}
        {state.reading === null ? 'no reading' : 'reading'}, {state.plan === null ? 'no plan' : 'plan'},{' '}
        {state.kept ? 'kept' : 'not kept'}
      </p>
      <button
        type="button"
        onClick={() => {
          save({ location: delhi, language: 'hi' });
        }}
      >
        Delhi
      </button>
      <button
        type="button"
        onClick={() => {
          setReading(reading);
          setPlan(plan);
        }}
      >
        Fill
      </button>
      <button type="button" onClick={forget}>
        Forget
      </button>
    </>
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('applySave', () => {
  it('keeps the reading and plan when nothing they depend on changes', () => {
    expect(applySave(start, { location: { ...delhi } })).toMatchObject({ reading, plan });
    expect(applySave(start, { place: null })).toMatchObject({ reading, plan });
  });

  it('drops the plan for a new household or language and both for a new location', () => {
    expect(applySave(start, { language: 'hi' })).toMatchObject({ language: 'hi', reading, plan: null });
    expect(applySave(start, { modelChoice: 'off' })).toMatchObject({
      modelChoice: 'off',
      reading,
      plan: null,
    });
    expect(applySave(start, { modelChoice: 'on' })).toMatchObject({ reading, plan });
    expect(applySave(start, { household: null })).toMatchObject({ reading, plan: null });
    expect(applySave(start, { location: { lat: 19.07, lon: 72.88 } })).toMatchObject({
      reading: null,
      plan: null,
    });
  });
});

describe('AppStateProvider', () => {
  it('loads what was kept, saves changes and forgets on request', async () => {
    saveState(window.localStorage, {
      version: 1,
      household: null,
      location: null,
      place: null,
      language: 'en',
      modelChoice: null,
    });
    render(
      <AppStateProvider storage={window.localStorage}>
        <Panel />
      </AppStateProvider>,
    );
    expect(screen.getByText('no place, no reading, no plan, kept')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delhi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fill' }));
    expect(screen.getByText('at 28.65, reading, plan, kept')).toBeInTheDocument();
    expect(loadState(window.localStorage)).toMatchObject({ location: delhi, language: 'hi' });
    await userEvent.click(screen.getByRole('button', { name: 'Forget' }));
    expect(screen.getByText('no place, no reading, no plan, kept')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('works in memory and says so when the browser keeps nothing', async () => {
    render(
      <AppStateProvider storage={null}>
        <Panel />
      </AppStateProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delhi' }));
    expect(screen.getByText('at 28.65, no reading, no plan, not kept')).toBeInTheDocument();
  });

  it('reports a refused write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    render(
      <AppStateProvider storage={window.localStorage}>
        <Panel />
      </AppStateProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delhi' }));
    expect(screen.getByText('at 28.65, no reading, no plan, not kept')).toBeInTheDocument();
  });

  it('refuses use outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function ActionsOnly(): ReactElement {
      useAppActions();
      return <p>never</p>;
    }
    expect(() => render(<Panel />)).toThrow('useAppState is used outside AppStateProvider');
    expect(() => render(<ActionsOnly />)).toThrow('useAppActions is used outside AppStateProvider');
  });
});
