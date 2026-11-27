// Display rounding for effects and figures. Values are kept exact; rounding happens only here, at the edge.
// The page, the rules text and the fact set sent to the model all use these, so a shown number is a sent number.
import type { Effect, Figure, WorkingInput } from './types.js';

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

/** A computed figure's value as shown: a whole number, the same value the fact set sends. */
export function figureValue(figure: Figure): number {
  return Math.round(figure.value);
}

/** A computed figure as the page shows it, such as 243 m³/h. */
export function formatFigure(figure: Figure): string {
  return `${String(figureValue(figure))} ${figure.unit}`;
}

/** A working input as shown: factors exactly as their source prints them, other inputs to one decimal. */
export function displayValue(input: WorkingInput): number {
  return input.from === 'fact' ? input.value : Math.round(input.value * 10) / 10;
}

/**
 * For a move to other hours, the change at the new start itself. Its working lists the usual hours first and the
 * new hours second, so the planned change is their ratio. Null for every other effect.
 */
export function plannedChange(effect: Effect): number | null {
  if (effect.kind !== 'exposure' || !effect.working.factIds.includes('exposure-dose-method')) {
    return null;
  }
  const [usual, moved] = effect.working.inputs;
  return usual && moved && usual.value > 0 ? moved.value / usual.value - 1 : null;
}

/** Every number an effect shows, as shown, for the fact set the model may quote from. */
export function displayNumbers(effect: Effect): number[] {
  if (effect.kind === 'exposure') {
    const { low, high } = effect.change;
    const planned = plannedChange(effect);
    const values = planned === null ? [low, high] : [low, high, planned];
    return values.flatMap((value) => [Math.abs(percentOf(value)), timesOf(value)]);
  }
  const range = effect.range ? [effect.range.low, effect.range.high] : [];
  return [...[effect.changeKg, ...range].map((kg) => Math.abs(roundKg(kg))), effect.occupancy];
}
