// Display rounding and wording for effects. Values are kept exact; rounding happens only here, at the edge.
// The page, the rules text and the fact set sent to the model all use these, so a shown number is a sent number.
import type { Range } from '../../lib/types.js';
import type { Effect, WorkingInput } from './types.js';

/** Minutes since midnight for an HH:MM clock time. */
export function minutesOf(clock: string): number {
  return Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
}

/** HH:MM for minutes since midnight, wrapping past midnight. */
export function clockOf(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** A fraction as a whole signed percent, such as -0.453 to -45. */
export function percentOf(fraction: number): number {
  return Math.round(fraction * 100);
}

/** A relative change as a multiple, to one decimal, such as 1.7 for a rise of 70 percent. */
export function timesOf(fraction: number): number {
  return Math.round((1 + fraction) * 10) / 10;
}

/** Kilograms rounded for display: two decimals under 1 kg, one under 10 kg, whole above. */
export function roundKg(kg: number): number {
  const size = Math.abs(kg);
  const places = size < 1 ? 100 : size < 10 ? 10 : 1;
  return Math.round(kg * places) / places;
}

/** A working input as shown: factors exactly as their source prints them, other inputs to one decimal. */
export function displayValue(input: WorkingInput): number {
  return input.from === 'fact' ? input.value : Math.round(input.value * 10) / 10;
}

function span(low: number, high: number, unit: string): string {
  return low === high ? `about ${String(low)} ${unit}` : `${String(low)} to ${String(high)} ${unit}`;
}

function side(fraction: number): string {
  if (fraction > 1) {
    return `${String(timesOf(fraction))} times as much`;
  }
  return fraction < 0
    ? `a cut of ${String(-percentOf(fraction))} percent`
    : `a rise of ${String(percentOf(fraction))} percent`;
}

/** A relative change in words: "a cut of 30 to 45 percent", "1.4 to 3.6 times as much", or a span across zero. */
export function describeChange(change: Range): string {
  const low = percentOf(change.low);
  const high = percentOf(change.high);
  if (low === 0 && high === 0) {
    return 'no change';
  }
  if (high <= 0) {
    return `a cut of ${span(-high, -low, 'percent')}`;
  }
  if (low >= 0 && change.high > 1) {
    return span(timesOf(change.low), timesOf(change.high), 'times as much');
  }
  if (low >= 0) {
    return `a rise of ${span(low, high, 'percent')}`;
  }
  return `anywhere from ${side(change.low)} to ${side(change.high)}`;
}

/** An effect in words, as the page shows it next to an item. */
export function formatEffect(effect: Effect): string {
  if (effect.kind === 'exposure') {
    return `${describeChange(effect.change)} in what is breathed in`;
  }
  const ends = effect.range ? [effect.range.low, effect.range.high] : [effect.changeKg];
  const sizes = ends.map((kg) => Math.abs(roundKg(kg)));
  const small = Math.min(...sizes);
  const large = Math.max(...sizes);
  const size = small === large ? `${String(large)} kg` : `${String(small)} to ${String(large)} kg`;
  const word = effect.changeKg <= 0 ? 'less' : 'more';
  const shared = effect.working.inputs.some((input) => input.label.endsWith('people in the vehicle'));
  const vehicle = shared ? `, with ${String(effect.occupancy)} in the vehicle` : '';
  return `${size} ${word} CO2 a ${effect.per} for each person${vehicle}`;
}

/** Every number an effect shows, as shown, for the fact set the model may quote from. */
export function displayNumbers(effect: Effect): number[] {
  if (effect.kind === 'exposure') {
    const { low, high } = effect.change;
    return [low, high].flatMap((value) => [Math.abs(percentOf(value)), timesOf(value)]);
  }
  const range = effect.range ? [effect.range.low, effect.range.high] : [];
  return [...[effect.changeKg, ...range].map((kg) => Math.abs(roundKg(kg))), effect.occupancy];
}
