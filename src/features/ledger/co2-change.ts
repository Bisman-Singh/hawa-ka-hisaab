// The CO2 change for one traveller on one trip when the trip changes mode or occupancy.
import type { Travel } from '../household/types.js';
import { factNumber } from '../../config/facts/index.js';
import { travelCo2, type TripCo2 } from './co2.js';
import type { Effect, WorkingInput } from './types.js';

const FORMULA =
  'CO2 for one person is the km travelled times the factor for the vehicle, divided by the people sharing it. Bus and train factors are already per person. Change is the new way minus the current way.';

function labelled(inputs: readonly WorkingInput[], when: string): WorkingInput[] {
  return inputs.map((input) => ({ ...input, label: `${when}: ${input.label}` }));
}

const sameVehicle = (now: TripCo2, instead: TripCo2): boolean =>
  now.factIds.join() === instead.factIds.join();

function changeEnds(now: TripCo2, instead: TripCo2): number[] {
  return sameVehicle(now, instead)
    ? now.factIds.map((id) => factNumber(id).value * (instead.kmEach - now.kmEach))
    : [instead.low - now.high, instead.high - now.low];
}

function changeInputs(now: TripCo2, instead: TripCo2): WorkingInput[] {
  const changed = sameVehicle(now, instead)
    ? instead.inputs.filter(
        (input) => !now.inputs.some((same) => same.label === input.label && same.value === input.value),
      )
    : instead.inputs;
  return [...labelled(now.inputs, 'Now'), ...labelled(changed, 'Instead')];
}

/** The occupancy a change assumes: the new one when the trip is shared, else the current one. */
function sharedBy(now: TripCo2, instead: TripCo2): number {
  return instead.occupancy ?? now.occupancy ?? 1;
}

/**
 * The change in one traveller's CO2 for this trip when it is made another way, negative for a saving. Null when
 * either way has no figure, or no cited factor is involved, as between walking and cycling.
 */
export function co2ChangeEffect(before: Travel, after: Travel): Effect | null {
  const now = travelCo2(before);
  const instead = travelCo2(after);
  if (!now || !instead) {
    return null;
  }
  const factIds = [...new Set([...now.factIds, ...instead.factIds])];
  if (factIds.length === 0) {
    return null;
  }
  const ends = changeEnds(now, instead);
  const [low, high] = [Math.min(...ends), Math.max(...ends)];
  return {
    kind: 'co2',
    changeKg: (low + high) / 2,
    range: low === high ? null : { low, high },
    occupancy: sharedBy(now, instead),
    per: 'trip',
    working: {
      formula: FORMULA,
      inputs: changeInputs(now, instead),
      factIds,
    },
  };
}
