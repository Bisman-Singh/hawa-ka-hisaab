// Fake air sources for route tests, and a small PIN table whose rows are copied from the shipped PIN data.
import { buildPinTables } from '../../src/features/air/pin.js';
import type { AirSources, PinDirectory, PinTables } from '../../src/features/air/types.js';
import { err } from '../../src/lib/result.js';
import { createFakeAirProvider, createFakeForecastProvider, createFakeGeocoder } from './fake-air.js';

/** Real rows of the PIN table: Delhi, Gurgaon, Agra, Alwar, Mumbai, Shillong and the Andaman Islands. */
export function samplePinTables(): PinTables {
  return buildPinTables({
    centres: [
      {
        '110001': [28.642, 77.218],
        '110092': [28.627, 77.279],
        '122001': [28.418, 76.984],
        '282001': [27.145, 78.065],
        '301001': [27.464, 76.659],
      },
      { '400001': [18.947, 72.814], '744205': [12.503, 92.908], '793001': [25.567, 91.865] },
    ],
    labels: [
      {
        '110001': ['Central Delhi', 'Delhi'],
        '110092': ['East Delhi', 'Delhi'],
        '122001': ['Gurgaon', 'Haryana'],
        '282001': ['Agra', 'Uttar Pradesh'],
        '301001': ['Alwar', 'Rajasthan'],
      },
      {
        '400001': ['Mumbai', 'Maharashtra'],
        '744205': ['North And Middle Andaman', 'Andaman & Nicobar Islands'],
        '793001': ['East Khasi Hills', 'Meghalaya'],
      },
    ],
    prefixes: {
      '1100': [28.612, 77.158, 94, 17.4],
      '110': [28.612, 77.158, 94, 17.4],
      '1220': [28.4, 76.966, 19, 6.6],
      '4000': [18.981, 72.834, 80, 4.3],
      '7442': [12.503, 92.908, 1, 0.0],
      '744': [11.665, 92.71, 8, 11.7],
      '793': [25.567, 91.882, 31, 46.1],
    },
  });
}

/** A PIN directory over fixed tables that counts its loads. */
export function createFakePinDirectory(
  tables: PinTables = samplePinTables(),
): PinDirectory & { loads: () => number } {
  let count = 0;
  return {
    loads: () => count,
    load: () => {
      count += 1;
      return Promise.resolve(tables);
    },
  };
}

/** Air sources where every upstream is down and the PIN table is the sample, unless a test replaces a part. */
export function createFakeAirSources(overrides: Partial<AirSources> = {}): AirSources {
  return {
    stations: createFakeAirProvider([{ kind: 'miss', failure: { kind: 'network' } }]),
    stationProviders: [],
    forecast: createFakeForecastProvider(err({ kind: 'network' })),
    geocoder: createFakeGeocoder([], { kind: 'network' }),
    pins: createFakePinDirectory(),
    ...overrides,
  };
}
