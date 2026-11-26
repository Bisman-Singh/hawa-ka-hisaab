// Tests for PIN lookup: exact, four digit prefix with at least 3 PINs, three digit prefix, and not found.
import { describe, expect, it } from 'vitest';
import { buildPinTables, nearestPinLabel, resolvePin } from '../../../src/features/air/pin.js';
import { placeSchema } from '../../../src/features/air/schemas.js';
import { samplePinTables } from '../../support/fake-air-sources.js';

const tables = samplePinTables();

describe('resolvePin', () => {
  it('answers a known PIN with its centre and what was understood', () => {
    const place = resolvePin(tables, '110092');
    expect(place).toEqual({
      id: 'pin-110092',
      name: 'PIN 110092',
      district: 'East Delhi',
      state: 'Delhi',
      postcode: '110092',
      lat: 28.627,
      lon: 77.279,
      resolution: 'pin_exact',
      label: 'PIN 110092, East Delhi, Delhi',
      roughness: null,
    });
    expect(placeSchema.safeParse(place).success).toBe(true);
  });

  it('falls back to the four digit prefix and says how rough it is', () => {
    expect(resolvePin(tables, '110072')).toMatchObject({
      resolution: 'pin_prefix',
      district: null,
      state: 'Delhi',
      lat: 28.612,
      lon: 77.158,
      label: 'PIN 110072, near PINs starting 1100, Delhi',
      roughness: { prefix: '1100', pins: 94, spreadKm: 17.4 },
    });
  });

  it('skips a four digit prefix with fewer than 3 PINs for the three digit one', () => {
    expect(resolvePin(tables, '744299')).toMatchObject({
      resolution: 'pin_prefix',
      roughness: { prefix: '744', pins: 8, spreadKm: 11.7 },
      label: 'PIN 744299, near PINs starting 744, Andaman & Nicobar Islands',
    });
  });

  it('uses the three digit prefix when the four digit one is unknown, without a state it cannot name', () => {
    expect(resolvePin(tables, '793999')).toMatchObject({ roughness: { prefix: '793' }, state: 'Meghalaya' });
    const mixed = buildPinTables({
      centres: [{ '110001': [28.6, 77.2], '110002': [28.6, 77.2] }],
      labels: [{ '110001': ['A', 'Delhi'], '110002': ['B', 'Haryana'] }],
      prefixes: { '110': [28.6, 77.2, 2, 1] },
    });
    expect(resolvePin(mixed, '110555')).toMatchObject({
      state: null,
      label: 'PIN 110555, near PINs starting 110',
    });
    const unlabelled = buildPinTables({ centres: [], labels: [], prefixes: { '999': [20, 78, 4, 9] } });
    expect(resolvePin(unlabelled, '999123')).toMatchObject({ state: null });
  });

  it('says not found when neither the PIN nor its prefixes are known', () => {
    expect(resolvePin(tables, '560001')).toBeNull();
  });

  it('needs both a centre and a label for an exact answer', () => {
    const half = buildPinTables({ centres: [{ '560001': [12.97, 77.59] }], labels: [], prefixes: {} });
    expect(resolvePin(half, '560001')).toBeNull();
  });
});

describe('buildPinTables', () => {
  it('refuses data of the wrong shape', () => {
    expect(() => buildPinTables({ centres: [{ '110001': [91, 77] }], labels: [], prefixes: {} })).toThrow();
    expect(() => buildPinTables({ centres: [{ '11000': [28, 77] }], labels: [], prefixes: {} })).toThrow();
    expect(() => buildPinTables({ centres: [], labels: [], prefixes: { '11': [28, 77, 1, 0] } })).toThrow();
  });
});

describe('nearestPinLabel', () => {
  it('finds the district of the nearest PIN centre and its distance', () => {
    const nearest = nearestPinLabel(tables, { lat: 28.63, lon: 77.28 });
    expect(nearest?.label).toEqual(['East Delhi', 'Delhi']);
    expect(nearest?.km).toBeLessThan(1);
  });

  it('gives null for a table without labels', () => {
    const bare = buildPinTables({ centres: [{ '110001': [28.6, 77.2] }], labels: [], prefixes: {} });
    expect(nearestPinLabel(bare, { lat: 28.6, lon: 77.2 })).toBeNull();
  });
});
