// Tests for readAir and findPlaces over fake sources: rounding, the GRAP check and the PIN or town split.
import { describe, expect, it } from 'vitest';
import { findPlaces, readAir } from '../../../src/features/air/service.js';
import { ok } from '../../../src/lib/result.js';
import { createFakeAirSources, createFakePinDirectory } from '../../support/fake-air-sources.js';
import {
  createFakeAirProvider,
  createFakeForecastProvider,
  createFakeGeocoder,
  hourCurve,
  stationFeed,
} from '../../support/fake-air.js';
import { createFakeClock } from '../../support/fake-clock.js';

describe('readAir', () => {
  it('rounds the point before any source sees it and adds GRAP in Delhi', async () => {
    const forecast = createFakeForecastProvider(ok(hourCurve([90])));
    const sources = createFakeAirSources({
      stations: createFakeAirProvider([{ kind: 'fresh', feed: stationFeed() }]),
      forecast,
    });
    const response = await readAir(sources, createFakeClock(), { lat: 28.540721, lon: 77.168544 });
    expect(forecast.locations).toEqual([{ lat: 28.54, lon: 77.17 }]);
    expect(response.reading.path).toBe('station');
    expect(response.grap?.stage).toBe('II');
  });

  it('does not read the PIN table for a point far from NCR', async () => {
    const pins = createFakePinDirectory();
    const response = await readAir(createFakeAirSources({ pins }), createFakeClock(), {
      lat: 13.08,
      lon: 80.27,
    });
    expect(pins.loads()).toBe(0);
    expect(response.grap).toBeNull();
    expect(response.reading).toEqual({ path: 'unavailable', reason: 'feed_and_model_down' });
  });
});

describe('findPlaces', () => {
  const town = {
    id: 'place-1',
    name: 'Tawang Town',
    district: 'Tawang',
    state: 'Arunachal Pradesh',
    postcode: null,
    lat: 27.57417,
    lon: 91.795,
  };

  it('sends six digits, spaces allowed, to the PIN table and never to the geocoder', async () => {
    const sources = createFakeAirSources();
    expect(await findPlaces(sources, ' 110 092 ')).toMatchObject({
      ok: true,
      value: [{ postcode: '110092' }],
    });
    expect(await findPlaces(sources, '560001')).toEqual({ ok: true, value: [] });
  });

  it('sends anything else to the geocoder, trimmed', async () => {
    const sources = createFakeAirSources({ geocoder: createFakeGeocoder([town]) });
    expect(await findPlaces(sources, '  Tawang ')).toEqual({ ok: true, value: [town] });
    expect(await findPlaces(sources, '11009')).toEqual({ ok: true, value: [] });
    expect(await findPlaces(createFakeAirSources(), 'Tawang')).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });
});
