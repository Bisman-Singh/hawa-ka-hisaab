// Travel CO2 factors from the India GHG Program. Vehicle factors are per vehicle km and need an occupancy.
// There is deliberately no metro or electric vehicle factor: none was verified.
import type { Fact } from '../../lib/types.js';
import { numberFact } from './build.js';
import { GHG_RAIL, GHG_ROAD } from './sources.js';

const PER_VEHICLE_KM = 'kg CO2 per vehicle km';
const PER_PASSENGER_KM = 'kg CO2 per passenger km';

/** CO2 per km by vehicle type and fuel, and per passenger km for city buses and suburban rail. */
export const TRAVEL_FACTS: readonly Fact[] = [
  numberFact(
    { id: 'co2-scooter', title: 'Scooter under 110 cc', value: 0.0334, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-motorcycle', title: 'Motorcycle under 125 cc', value: 0.029, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-auto-petrol', title: 'Three-wheeler, petrol', value: 0.1135, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-auto-cng', title: 'Three-wheeler, CNG', value: 0.10768, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-car-petrol', title: 'Hatchback under 1400 cc, petrol', value: 0.13, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-car-diesel', title: 'Hatchback under 1400 cc, diesel', value: 0.117, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-car-cng', title: 'Small car under 800 cc, CNG', value: 0.063, unit: PER_VEHICLE_KM },
    GHG_ROAD,
  ),
  numberFact(
    { id: 'co2-bus', title: 'City bus, per passenger', value: 0.015161, unit: PER_PASSENGER_KM },
    GHG_ROAD,
  ),
  numberFact(
    {
      id: 'co2-suburban-rail',
      title: 'Suburban rail, per passenger, 2014-15',
      value: 0.007976,
      unit: PER_PASSENGER_KM,
    },
    GHG_RAIL,
  ),
];
