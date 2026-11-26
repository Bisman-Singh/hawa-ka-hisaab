// Valid sample objects for every contract, for tests to start from and change one field at a time.
// All values are synthetic test data. They are not facts and are never shown in the app.
import type { CommunityInput } from '../../src/features/community/types.js';
import type { Household } from '../../src/features/household/types.js';
import type { Effect, Working } from '../../src/features/ledger/types.js';
import type { Plan, PlanItem } from '../../src/features/planner/types.js';
import type { Source, Trace } from '../../src/lib/types.js';

/** Two adults, a child with asthma and a grandmother with a heart condition; one car. */
export function sampleHousehold(): Household {
  return {
    members: [
      { id: 'm1', ageGroup: 'adult', flags: [] },
      { id: 'm2', ageGroup: 'adult', flags: ['outdoor_worker'] },
      { id: 'm3', ageGroup: 'child', flags: ['asthma_or_lung'] },
      { id: 'm4', ageGroup: 'older_adult', flags: ['heart_condition'] },
    ],
    activities: [
      {
        id: 'a1',
        memberIds: ['m1'],
        kind: 'commute',
        label: 'office commute',
        start: '08:30',
        durationMinutes: 45,
        timing: 'fixed',
        setting: 'in_transit',
        travel: { mode: 'car', fuel: 'petrol', distanceKm: 14, occupancy: 1, roundTrip: true },
      },
      {
        id: 'a2',
        memberIds: ['m3'],
        kind: 'outdoor_play',
        label: 'football practice',
        start: '18:00',
        durationMinutes: 60,
        timing: 'flexible',
        setting: 'outdoor',
        travel: null,
      },
    ],
    home: {
      rooms: [
        { id: 'r1', kind: 'bedroom', areaSqFt: 140, purifier: null },
        { id: 'r2', kind: 'living', areaSqFt: 220, purifier: { cadrM3PerHour: 250 } },
      ],
      cookingFuel: 'lpg',
      indoorSources: ['mosquito_coil'],
    },
  };
}

/** A source record pointing at the public CPCB feed. */
export function sampleSource(): Source {
  return {
    title: 'CAAQMS hourly feed',
    publisher: 'Central Pollution Control Board',
    url: 'https://airquality.cpcb.gov.in/caaqms/rss_feed',
    published: null,
    retrieved: '2026-11-24',
  };
}

/** Working with one household input and one cited factor. */
export function sampleWorking(): Working {
  return {
    formula: 'distance times factor',
    inputs: [
      { label: 'distance', value: 28, unit: 'km', from: 'household', factId: null },
      { label: 'factor', value: 0.1, unit: 'kg CO2 per km', from: 'fact', factId: 'test-factor' },
    ],
    factIds: ['test-factor'],
  };
}

/** An exposure effect: a 30 to 60 percent cut for one member. */
export function sampleExposureEffect(): Effect {
  return { kind: 'exposure', change: { low: -0.6, high: -0.3 }, memberIds: ['m3'], working: sampleWorking() };
}

/** A CO2 effect for one trip with one occupant. */
export function sampleCo2Effect(): Effect {
  return { kind: 'co2', changeKg: -2.8, range: null, occupancy: 1, per: 'trip', working: sampleWorking() };
}

/** A trace for output made on the rules path because no key is set. */
export function sampleTrace(): Trace {
  return {
    producedBy: 'rules',
    modelId: null,
    fallbackReason: 'disabled',
    factsSent: [],
    modelReply: null,
    toolCalls: [],
    numberCheck: { status: 'not_run', attempts: 0, unmatched: [] },
  };
}

/** A plan item that moves football to a cleaner hour. */
export function samplePlanItem(): PlanItem {
  return {
    candidateId: 'move-a2',
    kind: 'reschedule',
    slot: 'afternoon',
    activityId: 'a2',
    memberIds: ['m3'],
    start: '16:00',
    title: 'Move football practice earlier',
    why: 'The forecast is cleaner before evening traffic.',
    tradeOff: null,
    effects: [sampleExposureEffect()],
    factIds: ['test-factor'],
    whatIfs: [],
  };
}

/** A one-item plan for a moderate day. */
export function samplePlan(): Plan {
  return {
    date: '2026-11-24',
    dayKind: 'moderate',
    band: 'poor',
    headline: 'Keep the evening indoors.',
    slots: { morning: [], afternoon: [samplePlanItem()], evening: [] },
    indoor: [],
    alternatives: [],
    language: 'en',
  };
}

/** A housing society with a generator and gate idling. */
export function sampleCommunity(): CommunityInput {
  return {
    kind: 'housing_society',
    homes: 240,
    pupils: null,
    generator: { hoursPerDay: 3, kva: 125, fuel: 'diesel' },
    wasteBurning: 'sometimes',
    gateIdling: { vehiclesPerDay: 400, idleMinutes: 2 },
    assembly: null,
    outdoorPeriods: [],
  };
}
