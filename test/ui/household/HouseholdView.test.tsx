// Tests for the household view: the typed text beside the form read from it, what was not placed and what was
// assumed with trip defaults, the model-down path, samples to start from, and the saved household kept here.
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { withDefaults } from '../../../src/features/assistant/intake.js';
import { SAMPLE_HOUSEHOLDS } from '../../../src/features/household/samples.js';
import type { Household } from '../../../src/features/household/types.js';
import { Announcer } from '../../../src/ui/hooks/announcer.js';
import { HouseholdView } from '../../../src/ui/household/HouseholdView.js';
import { markIntakeUsed, readIntake, setIntake } from '../../../src/ui/household/intake-store.js';
import { loadState, saveState } from '../../../src/ui/storage.js';
import { sample } from '../../support/plan-fixtures.js';
import { sampleHousehold, sampleTrace } from '../../support/samples.js';
import { axeViolations, renderInApp } from '../helpers.js';

const view = () =>
  renderInApp(
    <Announcer>
      <HouseholdView />
    </Announcer>,
  );
const people = () =>
  screen.getAllByRole('group', { name: /^Person \d/ }).map((group) => group.getAttribute('aria-labelledby'));

beforeEach(() => {
  window.localStorage.clear();
  setIntake(null);
});

describe('HouseholdView', () => {
  it('starts with no model from one adult, offers every sample, and loads one with an undo', async () => {
    const { container } = view();
    expect(screen.getByRole('heading', { level: 1, name: 'Your household' })).toBeInTheDocument();
    expect(people()).toHaveLength(1);
    const use = screen.getAllByRole('button', { name: 'Use this sample' });
    expect(use).toHaveLength(SAMPLE_HOUSEHOLDS.length);
    await userEvent.click(use[0] ?? document.body);
    expect(people()).toHaveLength(SAMPLE_HOUSEHOLDS[0]?.household.members.length ?? 0);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(people()).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  }, 30_000);

  it('shows the text beside the household read from it, with what was not placed and what was assumed', async () => {
    const reply = {
      household: sampleHousehold(),
      unplaced: ['a garden'],
      assumed: ['The walk is 30 minutes.'],
    };
    setIntake({
      text: 'Two adults and a child with asthma.',
      response: { outcome: 'parsed', ...reply, trace: sampleTrace() },
    });
    const { container } = view();
    expect(screen.getByText('Two adults and a child with asthma.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Not placed' })).toHaveTextContent('a garden');
    expect(screen.getByRole('region', { name: 'Assumed' })).toHaveTextContent('The walk is 30 minutes.');
    expect(people()).toHaveLength(sampleHousehold().members.length);
    expect(screen.getByRole('link', { name: 'Change what you wrote' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Save household' }));
    expect(loadState(window.localStorage).household).toEqual(sampleHousehold());
    expect(readIntake()?.used).toBe(true);
  }, 30_000);

  it('lists the stated default for who rides in a driven car among what was assumed', () => {
    const household = sample('family-car-asthma');
    const activities = household.activities.map((activity) =>
      activity.travel?.mode === 'car'
        ? { ...activity, travel: { ...activity.travel, occupancy: null } }
        : activity,
    );
    const reply = withDefaults({ household: { ...household, activities }, unplaced: [], assumed: [] });
    setIntake({
      text: 'I drive to the office.',
      response: { outcome: 'parsed', ...reply, trace: sampleTrace() },
    });
    view();
    const assumed = screen.getByRole('region', { name: 'Assumed' });
    expect(assumed).toHaveTextContent(/1 person in the car for .+, counting only who was named for it\./);
    expect(assumed).toHaveTextContent('Filled in where your text did not say');
  });

  it('leaves out empty lists and starts from the saved household once the read one was used', () => {
    const saved: Household = {
      ...sampleHousehold(),
      members: [{ id: 'm1', ageGroup: 'teen', flags: [] }],
      activities: [],
    };
    saveState(window.localStorage, {
      version: 1,
      household: saved,
      location: null,
      place: null,
      language: 'en',
      modelChoice: null,
    });
    setIntake({
      text: 'One teen.',
      response: {
        outcome: 'parsed',
        household: sampleHousehold(),
        unplaced: [],
        assumed: [],
        trace: sampleTrace(),
      },
    });
    markIntakeUsed();
    view();
    expect(screen.queryByRole('region', { name: 'Not placed' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Assumed' })).toBeNull();
    expect(people()).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Age group' })).toHaveValue('teen');
  });

  it('says plainly why the model did not read the text, and offers the form', () => {
    setIntake({
      text: 'Two adults.',
      response: { outcome: 'unavailable', reason: 'rate_limited', trace: sampleTrace() },
    });
    view();
    expect(
      screen.getByRole('heading', { name: 'The model is not reading descriptions right now' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This browser sent several descriptions in a short time/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save household' })).toBeInTheDocument();
  });
});
