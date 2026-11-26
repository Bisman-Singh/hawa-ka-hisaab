// Tests for the provider chain: first fresh copy wins, else the newest last good copy, else a miss.
import { describe, expect, it } from 'vitest';
import type { StationFeedRead } from '../../../src/features/air/types.js';
import { chainProviders } from '../../../src/server/air/chain.js';
import { createFakeAirProvider, stationFeed } from '../../support/fake-air.js';

const fresh: StationFeedRead = { kind: 'fresh', feed: stationFeed() };
const miss: StationFeedRead = { kind: 'miss', failure: { kind: 'timeout' } };
const lastGood = (feedHour: string): StationFeedRead => ({
  kind: 'last_good',
  feed: { ...stationFeed(), feedHour },
  failure: { kind: 'network' },
});

describe('chainProviders', () => {
  it('stops at the first fresh copy', async () => {
    const second = createFakeAirProvider([fresh]);
    expect(await chainProviders([createFakeAirProvider([fresh]), second]).readStations()).toEqual(fresh);
    expect(second.calls()).toBe(0);
  });

  it('moves on when the direct feed fails', async () => {
    const dataGov = createFakeAirProvider([fresh]);
    expect(await chainProviders([createFakeAirProvider([miss]), dataGov]).readStations()).toEqual(fresh);
    expect(dataGov.calls()).toBe(1);
  });

  it('serves the newest last good copy when none is fresh', async () => {
    const older = lastGood('2026-11-24T20:00:00+05:30');
    const newer = lastGood('2026-11-24T21:00:00+05:30');
    const chain = (reads: StationFeedRead[]) =>
      chainProviders(reads.map((read) => createFakeAirProvider([read])));
    expect(await chain([older, newer]).readStations()).toEqual(newer);
    expect(await chain([newer, older]).readStations()).toEqual(newer);
    expect(await chain([miss, older, miss]).readStations()).toEqual(older);
  });

  it('reports the last miss when every provider missed, and a miss with no providers', async () => {
    const other: StationFeedRead = { kind: 'miss', failure: { kind: 'status', status: 403 } };
    expect(
      await chainProviders([createFakeAirProvider([miss]), createFakeAirProvider([other])]).readStations(),
    ).toEqual(other);
    expect(await chainProviders([]).readStations()).toEqual({ kind: 'miss', failure: { kind: 'network' } });
  });
});
