// Tests for action selection: levels by band, the gate and generator tests, and the rank order of actions.
import { describe, expect, it } from 'vitest';
import type { Situation } from '../../../src/features/community/rules.js';
import {
  ACTION_IDS,
  idlesAtGate,
  levelOf,
  runsDgSet,
  selectActions,
} from '../../../src/features/community/rules.js';
import type { CommunityInput } from '../../../src/features/community/types.js';
import { BANDS, fullSchool, fullSociety, grapNotice } from './support.js';

function situation(overrides: Partial<Situation> = {}): Situation {
  return {
    community: fullSociety(),
    band: 'severe',
    timing: { window: null, periods: [] },
    grap: null,
    month: 11,
    ...overrides,
  };
}

describe('levelOf', () => {
  it('starts the strict level at Poor and says unknown without a band', () => {
    expect(BANDS.map(levelOf)).toEqual(['mild', 'mild', 'moderate', 'high', 'high', 'high']);
    expect(levelOf(null)).toBe('unknown');
  });
});

describe('idlesAtGate and runsDgSet', () => {
  it('need vehicles that wait with engines on, and a generator the DG set share covers', () => {
    const base = fullSociety();
    expect(idlesAtGate(base)).toBe(true);
    expect(idlesAtGate({ ...base, gateIdling: { vehiclesPerDay: 40, idleMinutes: 0 } })).toBe(false);
    expect(idlesAtGate({ ...base, gateIdling: { vehiclesPerDay: 0, idleMinutes: 3 } })).toBe(false);
    expect(idlesAtGate({ ...base, gateIdling: null })).toBe(false);
    const gas: CommunityInput['generator'] = { hoursPerDay: 3, kva: null, fuel: 'gas' };
    expect([
      runsDgSet(base),
      runsDgSet({ ...base, generator: gas }),
      runsDgSet({ ...base, generator: null }),
    ]).toEqual([true, false, false]);
    expect(runsDgSet({ ...base, generator: { hoursPerDay: 0, kva: null, fuel: 'diesel' } })).toBe(false);
  });
});

describe('selectActions', () => {
  it('keeps the rank order of ACTION_IDS', () => {
    const picked = selectActions(situation({ grap: grapNotice() }));
    expect(picked).toEqual(ACTION_IDS.filter((id) => picked.includes(id)));
    expect(picked).toEqual([
      'health-advice',
      'outdoor-indoors',
      'windows',
      'wet-mopping',
      'masks',
      'outdoor-staff',
      'no-idling',
      'stop-waste-burning',
      'generator-essential',
      'grap-stage',
    ]);
  });

  it('needs entered staff, periods and an assembly before it moves anyone', () => {
    const quiet: CommunityInput = { ...fullSociety(), outdoorStaff: null, wasteBurning: 'never' };
    expect(selectActions(situation({ community: quiet }))).not.toContain('outdoor-staff');
    expect(selectActions(situation({ community: quiet }))).not.toContain('stop-waste-burning');
    const school = selectActions(situation({ community: fullSchool() }));
    expect(school).toEqual(expect.arrayContaining(['assembly-indoors', 'outdoor-indoors']));
  });

  it('adds the sports advisory for an NCR school in November and December only', () => {
    const school = { community: fullSchool(), grap: grapNotice('none') };
    expect(selectActions(situation({ ...school, month: 12 }))).toContain('grap-sports');
    expect(selectActions(situation({ ...school, month: 10 }))).not.toContain('grap-sports');
    expect(selectActions(situation({ ...school, month: 12, band: 'good' }))).not.toContain('grap-sports');
    expect(selectActions(situation({ ...school, month: 12 }))).not.toContain('grap-stage');
  });

  it('moves periods to the cleaner hours on a Moderate day only when one is in the dirtier half', () => {
    const timing = { window: { start: 13, end: 16 }, periods: [{ start: '08:50', worse: false }] };
    expect(selectActions(situation({ band: 'moderate', timing }))).not.toContain('outdoor-move');
    const worse = { ...timing, periods: [{ start: '08:50', worse: true }] };
    expect(selectActions(situation({ band: 'moderate', timing: worse }))).toContain('outdoor-move');
  });
});
