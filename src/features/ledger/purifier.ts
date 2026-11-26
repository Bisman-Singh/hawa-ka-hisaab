// Purifier sizing from the EPA figures: the smallest clean air delivery rate a room needs, in m³ per hour.
import { factNumber } from '../../config/facts/index.js';
import type { Figure, WorkingInput } from './types.js';

function factor(label: string, factId: string, unit: string): WorkingInput {
  return { label, value: factNumber(factId).value, unit, from: 'fact', factId };
}

/** The smallest purifier CADR a room of this floor area needs, in m³ per hour, with the cfm conversion shown. */
export function purifierNeed(areaSqFt: number): Figure {
  const rate = factNumber('purifier-cadr-per-area').value;
  const toM3h = factNumber('unit-cfm-m3h').value;
  return {
    label: 'Smallest purifier CADR for this room',
    value: ((areaSqFt * rate) / 100) * toM3h,
    unit: 'm³/h',
    working: {
      formula:
        'Room area times the EPA rate per hundred sq ft gives the smallest CADR in cfm for a standard ceiling. Times the NIST factor turns cfm into m³ per hour.',
      inputs: [
        { label: 'Room area', value: areaSqFt, unit: 'sq ft', from: 'household', factId: null },
        factor('EPA rate', 'purifier-cadr-per-area', 'cfm per 100 sq ft'),
        factor('cfm to m³ per hour', 'unit-cfm-m3h', 'm³/h per cfm'),
      ],
      factIds: ['purifier-cadr-per-area', 'unit-cfm-m3h'],
    },
  };
}

/** True when a purifier's CADR, in m³ per hour, meets the room's need. */
export function purifierCovers(cadrM3PerHour: number, need: Figure): boolean {
  return cadrM3PerHour >= need.value;
}
