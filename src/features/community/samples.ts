// Sample communities for the form and the documents. They are made up, described by make-up only, and carry no
// person or organisation names. The place is chosen separately, so the same sample works in any city.
import type { CommunityInput } from './types.js';

/** A sample with a short description a reader can recognise. */
export interface CommunitySample {
  readonly id: string;
  readonly description: string;
  readonly input: CommunityInput;
}

/** Two made-up communities: a housing society and a primary school. */
export const COMMUNITY_SAMPLES: readonly CommunitySample[] = [
  {
    id: 'society-generator-bus-stop',
    description:
      'A housing society of 120 flats with a diesel generator, a school bus stop at the gate, an early walking group and evening play in the park',
    input: {
      kind: 'housing_society',
      homes: 120,
      pupils: null,
      generator: { hoursPerDay: 2, kva: 160, fuel: 'diesel' },
      wasteBurning: 'sometimes',
      gateIdling: { vehiclesPerDay: 60, idleMinutes: 5 },
      assembly: null,
      outdoorPeriods: [
        { start: '06:30', durationMinutes: 60 },
        { start: '17:00', durationMinutes: 90 },
      ],
      children: 70,
      olderAdults: 45,
      outdoorStaff: 9,
    },
  },
  {
    id: 'primary-school-assembly',
    description:
      'A primary school with 400 pupils, morning assembly outdoors, two outdoor periods and parents dropping off by car',
    input: {
      kind: 'school',
      homes: null,
      pupils: 400,
      generator: null,
      wasteBurning: 'never',
      gateIdling: { vehiclesPerDay: 150, idleMinutes: 4 },
      assembly: '07:45',
      outdoorPeriods: [
        { start: '10:30', durationMinutes: 40 },
        { start: '13:20', durationMinutes: 40 },
      ],
      outdoorStaff: 4,
    },
  },
];
