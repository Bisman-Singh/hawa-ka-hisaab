// Tests for what the model reads: people and activities in words, candidates with effect sentences and no working.
import { describe, expect, it } from 'vitest';
import {
  candidatesView,
  citedByAnswer,
  householdView,
  stationNames,
} from '../../../src/features/assistant/plan-view.js';
import type { AirSummary } from '../../../src/features/air/reading-facts.js';
import type { Travel } from '../../../src/features/household/types.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { planContext, sample } from '../../support/plan-fixtures.js';

describe('householdView', () => {
  it('describes members and only the activities asked for, with their trips in words', () => {
    const household = sample('family-car-asthma');
    const view = householdView(household, new Set(['a1']));
    expect(view.members.map((member) => member.is)).toContain('child with asthma or a lung condition');
    expect(view.activities).toEqual([
      {
        id: 'a1',
        name: 'office commute',
        who: ['m1'],
        start: '08:30',
        minutes: 45,
        timing: 'fixed',
        setting: 'in_transit',
        trip: 'car, petrol, 14 km one way, there and back, 1 in the vehicle',
      },
    ]);
    const travel: Travel = {
      mode: 'two_wheeler',
      fuel: null,
      distanceKm: null,
      occupancy: null,
      roundTrip: false,
    };
    const first = household.activities.slice(0, 1).map((activity) => ({ ...activity, travel }));
    expect(householdView({ ...household, activities: first }, new Set(['a1'])).activities[0]?.trip).toBe(
      'two wheeler, distance not given, one way, riders not given',
    );
  });
});

describe('candidatesView', () => {
  it('gives each candidate its effects as sentences and lists the steps the plan shows anyway', () => {
    const ctx = planContext(sample('family-car-asthma'), 'poor');
    const set = buildCandidates(ctx);
    const view = candidatesView(set, set.actions);
    expect(JSON.stringify(view)).not.toContain('working');
    expect(view.candidates.find((candidate) => candidate.id === 'swap-a1')?.effects[0]).toMatch(
      /kg less CO2 for each person/,
    );
    expect(view.alsoInPlan).toContain('Do not burn a mosquito coil in a closed room');
  });
});

describe('stationNames', () => {
  it('is the station name when there is a station, and nothing for a modelled reading', () => {
    const air: AirSummary = {
      path: 'station',
      band: 'poor',
      aqi: 246,
      station: 'Sector 62, Noida - IMD',
      distanceKm: 3,
      time: '06:00',
      stale: false,
    };
    expect(stationNames(air)).toEqual(['Sector 62, Noida - IMD']);
    expect(stationNames({ ...air, path: 'modelled', station: null })).toEqual([]);
  });
});

describe('citedByAnswer', () => {
  it('cites the facts behind the options of the activities an answer names, by name or by start time', () => {
    const household = sample('family-car-asthma');
    const set = buildCandidates(planContext(household, 'poor'));
    const byName = citedByAnswer('Move the Football practice to the afternoon.', set.actions, household);
    expect(byName).toContain('exposure-dose-method');
    const byTime = citedByAnswer('दादी 07:00 बजे की जगह 15:00 बजे जाएँ।', set.actions, household);
    expect(byTime.length).toBeGreaterThan(0);
    expect(citedByAnswer('Nothing named here.', set.actions, household)).toEqual([]);
  });
});
