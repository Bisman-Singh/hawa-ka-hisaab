// Protection that does not move an activity: a well fitted mask, a light pace instead of a hard one, and a closed
// car with the AC on instead of open windows.
import { factEnds, factNumber } from '../../config/facts/index.js';
import { isYoungChild } from '../household/members.js';
import type { Member } from '../household/types.js';
import { changeRange } from './exposure.js';
import type { Effect, WorkingInput } from './types.js';

function topOf(label: string, factId: string): WorkingInput {
  return { label, value: Math.max(...factEnds(factId)), unit: 'share of particles', from: 'fact', factId };
}

/**
 * A mask for the adults on an activity. The best case is an N95 worn well, the worst a mask that leaks around the
 * edges. Null when everyone is a child, since no study measured mask protection for children.
 */
export function maskEffect(members: readonly Member[]): Effect | null {
  const wearers = members.filter((member) => !isYoungChild(member));
  if (wearers.length === 0) {
    return null;
  }
  const best = topOf('N95 and CaN99 worn in a lab test, share filtered, best case', 'mask-n95-filtered');
  const worst = topOf(
    'Diesel black carbon let into masks worn at rest in a chamber, worst case',
    'mask-leakage',
  );
  return {
    kind: 'exposure',
    change: changeRange([1 - best.value, worst.value]),
    memberIds: wearers.map((member) => member.id),
    working: {
      formula:
        'A mask cuts what you breathe in by the share of particles it keeps out. The best case is an N95 that fits well; the worst is a mask that lets air in around the edges. Fit decides where you land.',
      inputs: [best, worst],
      factIds: [
        'mask-n95-filtered',
        'mask-leakage',
        'mask-filtration-quote',
        'mask-leakage-quote',
        'advice-masks',
      ],
    },
  };
}

function ratioInput(label: string, factId: string): WorkingInput {
  return { label, value: factNumber(factId).value, unit: 'times the air outside', from: 'fact', factId };
}

/**
 * A car trip with the windows up and the AC on, against the windows open, for the same minutes. The Delhi study
 * measured both against the air outside; the health ministry advises AC on recirculate. Null with no one on it.
 */
export function closedCarEffect(memberIds: readonly string[]): Effect | null {
  if (memberIds.length === 0) {
    return null;
  }
  const closed = ratioInput('Windows up, AC on: air inside against outside', 'exposure-ratio-car-ac');
  const open = ratioInput('Windows open: air inside against outside', 'exposure-ratio-car-open');
  const change = closed.value / open.value - 1;
  return {
    kind: 'exposure',
    change: { low: change, high: change },
    memberIds: [...memberIds],
    working: {
      formula:
        'Same car, same minutes, same breathing; only the air inside changes. The ratio with the windows up and the AC on, divided by the ratio with the windows open, minus one.',
      inputs: [closed, open],
      factIds: [
        'advice-ac-recirculate',
        'exposure-onroad-quote',
        'exposure-ratio-car-ac',
        'exposure-ratio-car-open',
      ],
    },
  };
}

type RateGroup = 'child' | 'adult';
const RATE_GROUPS: readonly RateGroup[] = ['child', 'adult'];

const rateGroup = (member: Member): RateGroup => (isYoungChild(member) ? 'child' : 'adult');

function rates(group: RateGroup): { light: number; others: number[]; ids: string[]; inputs: WorkingInput[] } {
  const ids = ['light', 'moderate', 'high'].map((effort) => `breathing-${group}-${effort}`);
  const inputs: WorkingInput[] = ids.map((id) => ({
    label: `Breathing rate, ${id.replace('breathing-', '').replace('-', ', ')} effort`,
    value: factNumber(id).value,
    unit: 'litres per minute',
    from: 'fact',
    factId: id,
  }));
  const values = inputs.map((input) => input.value);
  return { light: Math.min(...values), others: values.slice(1), ids, inputs };
}

/**
 * Keeping an outdoor activity to a light pace for the same minutes, against a usual pace from moderate to hard.
 * Children use the rates for ages 6 to 10 and everyone else the adult rates. Null with no members.
 */
export function lightPaceEffect(members: readonly Member[]): Effect | null {
  const groups = RATE_GROUPS.filter((group) => members.some((member) => rateGroup(member) === group));
  if (groups.length === 0) {
    return null;
  }
  const tables = groups.map(rates);
  return {
    kind: 'exposure',
    change: changeRange(tables.flatMap((table) => table.others.map((rate) => table.light / rate))),
    memberIds: members.map((member) => member.id),
    working: {
      formula:
        'Same place, same minutes; only how fast you breathe changes. Light pace divided by the usual pace, minus one. The range covers a usual pace from moderate to hard.',
      inputs: tables.flatMap((table) => table.inputs),
      factIds: tables.flatMap((table) => table.ids),
    },
  };
}
