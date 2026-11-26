// Tests for GET /api/places through the whole app: town search, PIN exact and by prefix, not found, failures.
import { describe, expect, it } from 'vitest';
import { placesResponseSchema } from '../../../src/features/air/contract.js';
import type { Place } from '../../../src/features/air/types.js';
import { createApp } from '../../../src/server/app.js';
import { createFakeAirSources } from '../../support/fake-air-sources.js';
import { createFakeGeocoder } from '../../support/fake-air.js';
import { createTestDeps } from '../../support/test-deps.js';

const SHILLONG: Place = {
  id: 'place-1256523',
  name: 'Shillong',
  district: 'East Khasi Hills',
  state: 'Meghalaya',
  postcode: null,
  lat: 25.56892,
  lon: 91.88313,
  resolution: 'search',
  label: 'Shillong, East Khasi Hills, Meghalaya',
  roughness: null,
};

function app(geocoder = createFakeGeocoder([SHILLONG])) {
  const test = createTestDeps({ air: createFakeAirSources({ geocoder }) });
  return { app: createApp(test.deps), test };
}

async function places(path: string, target = app().app): Promise<readonly Place[]> {
  const response = await target.request(path);
  expect(response.status).toBe(200);
  return placesResponseSchema.parse(await response.json()).places;
}

describe('GET /api/places', () => {
  it('finds a town, cached for a day', async () => {
    const response = await app().app.request('/api/places?q=Shillong');
    expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
    expect(placesResponseSchema.parse(await response.json()).places).toEqual([SHILLONG]);
  });

  it('answers an empty list when a place is not found', async () => {
    expect(await places('/api/places?q=Xqzzyv')).toEqual([]);
  });

  it('answers a known PIN from the PIN table with what was understood', async () => {
    expect(await places('/api/places?q=110092')).toMatchObject([
      { resolution: 'pin_exact', label: 'PIN 110092, East Delhi, Delhi', roughness: null },
    ]);
  });

  it('answers an unknown PIN from its prefix and says how rough that is', async () => {
    expect(await places('/api/places?q=110072')).toMatchObject([
      { resolution: 'pin_prefix', roughness: { prefix: '1100', pins: 94, spreadKm: 17.4 } },
    ]);
  });

  it('answers an empty list for a PIN it cannot place', async () => {
    expect(await places('/api/places?q=560001')).toEqual([]);
  });

  it('answers 503 when the search service fails, and logs it without the query', async () => {
    const { app: target, test } = app(createFakeGeocoder([], { kind: 'timeout' }));
    const response = await target.request('/api/places?q=Secret%20Street%20Name');
    expect(response.status).toBe(503);
    expect(test.logText()).toContain('"code":"timeout"');
    expect(test.logText()).not.toContain('Secret');
  });

  it('refuses an empty or overlong query', async () => {
    expect((await app().app.request('/api/places?q=%20')).status).toBe(400);
    expect((await app().app.request(`/api/places?q=${'a'.repeat(81)}`)).status).toBe(400);
  });
});
