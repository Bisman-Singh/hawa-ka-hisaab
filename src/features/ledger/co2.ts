// Travel CO2 for one traveller from India GHG Program factors. Vehicle factors are shared by the people inside;
// bus and rail factors are already per passenger. No figure without a distance, an occupancy or a cited factor.
import { factNumber } from '../../config/facts/index.js';
import type { Fuel, Travel, TravelMode } from '../household/types.js';
import type { WorkingInput } from './types.js';

const CAR: Partial<Record<Fuel, readonly string[]>> = {
  petrol: ['co2-car-petrol'],
  diesel: ['co2-car-diesel'],
  cng: ['co2-car-cng'],
  unknown: ['co2-car-cng', 'co2-car-diesel', 'co2-car-petrol'],
};
const TWO_WHEELER = ['co2-motorcycle', 'co2-scooter'];

const PER_VEHICLE: Partial<Record<TravelMode, Partial<Record<Fuel, readonly string[]>>>> = {
  car: CAR,
  taxi: CAR,
  two_wheeler: { petrol: TWO_WHEELER, unknown: TWO_WHEELER },
  auto_rickshaw: {
    petrol: ['co2-auto-petrol'],
    cng: ['co2-auto-cng'],
    unknown: ['co2-auto-cng', 'co2-auto-petrol'],
  },
};

const PER_PASSENGER: Partial<Record<TravelMode, string>> = {
  bus: 'co2-bus',
  suburban_rail: 'co2-suburban-rail',
};
const NO_FUEL: ReadonlySet<TravelMode> = new Set(['walk', 'cycle']);

/**
 * One traveller's CO2 for a trip as described, both legs when it is a round trip, as a low and high end. kmEach is
 * the traveller's share of the vehicle km, or the km travelled on a per passenger mode.
 */
export interface TripCo2 {
  readonly low: number;
  readonly high: number;
  readonly occupancy: number | null;
  readonly kmEach: number;
  readonly inputs: readonly WorkingInput[];
  readonly factIds: readonly string[];
}

interface Basis {
  readonly ids: readonly string[];
  readonly share: number | null;
}

function basis(travel: Travel): Basis | null {
  if (NO_FUEL.has(travel.mode)) {
    return { ids: [], share: null };
  }
  const passenger = PER_PASSENGER[travel.mode];
  if (passenger) {
    return { ids: [passenger], share: null };
  }
  const ids = travel.fuel === null ? undefined : PER_VEHICLE[travel.mode]?.[travel.fuel];
  return ids && travel.occupancy !== null ? { ids, share: travel.occupancy } : null;
}

function own(label: string, value: number, unit: string): WorkingInput {
  return { label, value, unit, from: 'household', factId: null };
}

function tripInputs(travel: Travel, found: Basis, distanceKm: number): WorkingInput[] {
  const factors = found.ids.map((id): WorkingInput => ({
    label: 'factor',
    value: factNumber(id).value,
    unit: 'kg CO2 per km',
    from: 'fact',
    factId: id,
  }));
  const people = found.share === null ? [] : [own('people in the vehicle', found.share, 'people')];
  return [
    own('distance one way', distanceKm, 'km'),
    own('legs', travel.roundTrip ? 2 : 1, 'legs'),
    ...factors,
    ...people,
  ];
}

/**
 * CO2 for one traveller on this trip as described, both legs when it is a round trip. Null when the distance,
 * the occupancy of a shared vehicle or a cited factor is missing, as for the metro or an electric car.
 * An unknown fuel spans the factors of the fuels that vehicle comes in.
 */
export function travelCo2(travel: Travel): TripCo2 | null {
  const found = basis(travel);
  if (found === null || travel.distanceKm === null) {
    return null;
  }
  const kmEach = (travel.distanceKm * (travel.roundTrip ? 2 : 1)) / (found.share ?? 1);
  const kg = found.ids.map((id) => kmEach * factNumber(id).value);
  const ends = kg.length > 0 ? kg : [0];
  return {
    low: Math.min(...ends),
    high: Math.max(...ends),
    occupancy: found.share,
    kmEach,
    inputs: tripInputs(travel, found, travel.distanceKm),
    factIds: found.ids,
  };
}
