// PIN lookup: exact PIN, then its four digit prefix when at least 3 known PINs share it, then three digits.
// A PIN centre is city level at best; answers say what was understood and, for a prefix, how rough it is.
import { z } from 'zod';
import { boundedText } from '../../lib/schemas/common.js';
import { distanceKm } from './geo.js';
import { locationSchema } from './schemas.js';
import type { Location, PinTables, Place } from './types.js';

/** Fewest known PINs a four digit prefix needs before its centre is used. */
export const MIN_PREFIX_PINS = 3;

const lat = locationSchema.shape.lat;
const lon = locationSchema.shape.lon;
const pinKey = z.string().regex(/^[1-9]\d{5}$/);
const centresSchema = z.record(pinKey, z.tuple([lat, lon]));
const labelsSchema = z.record(pinKey, z.tuple([boundedText(120), boundedText(120)]));
const prefixesSchema = z.record(
  z.string().regex(/^\d{3,4}$/),
  z.tuple([lat, lon, z.int().min(1), z.number().min(0)]),
);

/** The PIN data as loaded: the parts of the centre and label tables, and the prefix table. */
export interface PinParts {
  readonly centres: readonly unknown[];
  readonly labels: readonly unknown[];
  readonly prefixes: unknown;
}

function prefixStates(labels: ReadonlyMap<string, readonly [string, string]>): Map<string, string | null> {
  const states = new Map<string, string | null>();
  for (const [pin, [, state]] of labels) {
    for (const prefix of [pin.slice(0, 4), pin.slice(0, 3)]) {
      const seen = states.get(prefix);
      states.set(prefix, seen === undefined || seen === state ? state : null);
    }
  }
  return states;
}

/** Checks the PIN data and builds the lookup maps. It throws on bad data, which is a fault in the shipped files. */
export function buildPinTables(parts: PinParts): PinTables {
  const centres = new Map(parts.centres.flatMap((part) => Object.entries(centresSchema.parse(part))));
  const labels = new Map(parts.labels.flatMap((part) => Object.entries(labelsSchema.parse(part))));
  const prefixes = new Map(Object.entries(prefixesSchema.parse(parts.prefixes)));
  return { centres, labels, prefixes, prefixStates: prefixStates(labels) };
}

function exactPlace(tables: PinTables, pin: string): Place | null {
  const centre = tables.centres.get(pin);
  const label = tables.labels.get(pin);
  if (!centre || !label) {
    return null;
  }
  const [district, state] = label;
  return {
    id: `pin-${pin}`,
    name: `PIN ${pin}`,
    district,
    state,
    postcode: pin,
    lat: centre[0],
    lon: centre[1],
    resolution: 'pin_exact',
    label: `PIN ${pin}, ${district}, ${state}`,
    roughness: null,
  };
}

function prefixPlace(tables: PinTables, pin: string, prefix: string): Place | null {
  const entry = tables.prefixes.get(prefix);
  if (!entry || (prefix.length === 4 && entry[2] < MIN_PREFIX_PINS)) {
    return null;
  }
  const [latitude, longitude, pins, spreadKm] = entry;
  const state = tables.prefixStates.get(prefix) ?? null;
  return {
    id: `pin-${pin}`,
    name: `PIN ${pin}`,
    district: null,
    state,
    postcode: pin,
    lat: latitude,
    lon: longitude,
    resolution: 'pin_prefix',
    label: `PIN ${pin}, near PINs starting ${prefix}${state === null ? '' : `, ${state}`}`,
    roughness: { prefix, pins, spreadKm },
  };
}

/** Resolves a six digit PIN, or gives null when neither the PIN nor its prefixes are known. */
export function resolvePin(tables: PinTables, pin: string): Place | null {
  return (
    exactPlace(tables, pin) ??
    prefixPlace(tables, pin, pin.slice(0, 4)) ??
    prefixPlace(tables, pin, pin.slice(0, 3))
  );
}

/** The district and state of the PIN centre nearest a point, and its distance, or null for an empty table. */
export function nearestPinLabel(
  tables: PinTables,
  location: Location,
): { readonly label: readonly [string, string]; readonly km: number } | null {
  let best: { readonly label: readonly [string, string]; readonly km: number } | null = null;
  for (const [pin, [latitude, longitude]] of tables.centres) {
    const km = distanceKm(location, { lat: latitude, lon: longitude });
    const label = tables.labels.get(pin);
    if (label && (best === null || km < best.km)) {
      best = { label, km };
    }
  }
  return best;
}
