// Exposure as a relative change: what is breathed in grows with how dirty the air is, how fast you breathe and for
// how long. Only ratios are shown, never a dose in micrograms, so the figure is a change with a range.
import { factNumber } from '../../config/facts/index.js';
import type { Range } from '../../lib/types.js';
import type { TravelMode } from '../household/types.js';
import type { Effect, WorkingInput } from './types.js';

/** One way of spending some minutes: the air outside, the air where you are against it, breathing and time. */
export interface Breathing {
  readonly pm25: number;
  readonly microRatio: number;
  readonly litresPerMinute: number;
  readonly minutes: number;
}

const taken = (b: Breathing): number => b.pm25 * b.microRatio * b.litresPerMinute * b.minutes;

/** What is breathed in after, as a multiple of before. Null when nothing was breathed in before. */
export function inhaledRatio(before: Breathing, after: Breathing): number | null {
  const base = taken(before);
  return base > 0 ? taken(after) / base : null;
}

/** The relative change spanned by some multiples, from the smallest to the largest. Never below -1. */
export function changeRange(ratios: readonly number[]): Range {
  return { low: Math.min(...ratios) - 1, high: Math.max(...ratios) - 1 };
}

/** A span of forecast hours with its mean modelled PM2.5, such as 14:00 to 15:00. */
export interface ForecastSpan {
  readonly label: string;
  readonly pm25: number;
}

const forecastInput = (span: ForecastSpan): WorkingInput => ({
  label: `Forecast PM2.5, ${span.label}, a model`,
  value: span.pm25,
  unit: 'µg/m³',
  from: 'forecast',
  factId: null,
});

/**
 * Moving the same activity to other hours: only the air changes. nearby holds the spans an hour either side of
 * the new start, so the range covers starting a little early or late. Null when the usual hours had clean air.
 */
export function shiftEffect(
  memberIds: readonly string[],
  spans: { readonly from: ForecastSpan; readonly to: ForecastSpan },
  nearby: readonly ForecastSpan[],
): Effect | null {
  const unit = (pm25: number): Breathing => ({ pm25, microRatio: 1, litresPerMinute: 1, minutes: 1 });
  const ratios = [spans.to, ...nearby].map((span) => inhaledRatio(unit(spans.from.pm25), unit(span.pm25)));
  const known = ratios.filter((ratio) => ratio !== null);
  if (known.length !== ratios.length) {
    return null;
  }
  return {
    kind: 'exposure',
    change: changeRange(known),
    memberIds: [...memberIds],
    working: {
      formula:
        'Same activity, same minutes, same breathing; only the air changes. New hours divided by the usual hours, minus one. The range covers starting an hour earlier or later.',
      inputs: [spans.from, spans.to, ...nearby].map(forecastInput),
      factIds: ['exposure-dose-method'],
    },
  };
}

interface Microenvironment {
  readonly ratioIds: readonly string[];
  readonly litresId: string;
}

const car: Microenvironment = {
  ratioIds: ['exposure-ratio-car-ac', 'exposure-ratio-car-open'],
  litresId: 'ventilation-vehicle',
};
const vehicle = (id: string): Microenvironment => ({
  ratioIds: [`exposure-ratio-${id}`],
  litresId: 'ventilation-vehicle',
});

const MICRO: Partial<Record<TravelMode, Microenvironment>> = {
  walk: { ratioIds: ['exposure-ratio-walk'], litresId: 'ventilation-walk' },
  cycle: { ratioIds: ['exposure-ratio-cycle'], litresId: 'ventilation-cycle' },
  two_wheeler: vehicle('two-wheeler'),
  auto_rickshaw: vehicle('auto'),
  car,
  taxi: car,
  bus: vehicle('bus'),
  school_bus: vehicle('bus'),
  metro: vehicle('metro'),
};

function spread(micro: Microenvironment): Range {
  const litres = factNumber(micro.litresId).value;
  const values = micro.ratioIds.map((id) => factNumber(id).value * litres);
  return { low: Math.min(...values), high: Math.max(...values) };
}

function microInputs(micro: Microenvironment, when: string): WorkingInput[] {
  return [...micro.ratioIds, micro.litresId].map((id) => ({
    label: `${when}: ${id.startsWith('ventilation') ? 'breathing rate' : 'air inside against outside'}`,
    value: factNumber(id).value,
    unit: id.startsWith('ventilation') ? 'litres per minute' : 'times the air outside',
    from: 'fact',
    factId: id,
  }));
}

/**
 * Switching how a trip is made, for the same minutes on the road. Null when either mode has no measured ratio,
 * as for suburban rail, or nothing changes. For a car the range runs from AC on recirculate to windows open.
 */
export function modeEffect(memberIds: readonly string[], from: TravelMode, to: TravelMode): Effect | null {
  const before = MICRO[from];
  const after = MICRO[to];
  if (!before || !after || from === to || memberIds.length === 0) {
    return null;
  }
  const [b, a] = [spread(before), spread(after)];
  return {
    kind: 'exposure',
    change: changeRange([a.low / b.high, a.high / b.low]),
    memberIds: [...memberIds],
    working: {
      formula:
        'Same minutes on the road. For each way of travelling: air inside against the air outside, times breathing rate. New divided by current, minus one. For a car the range runs from AC on recirculate to windows open.',
      inputs: [...microInputs(before, 'Now'), ...microInputs(after, 'Instead')],
      factIds: [
        'exposure-onroad-quote',
        ...new Set([...before.ratioIds, before.litresId, ...after.ratioIds, after.litresId]),
      ],
    },
  };
}
