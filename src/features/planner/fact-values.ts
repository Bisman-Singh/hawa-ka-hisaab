// Builders for the labelled numbers in a fact set: cited facts, clock times, shown effects and figures.
import { findFact } from '../../config/facts/index.js';
import type { FactValue } from '../../lib/types.js';
import { minutesOf } from '../../lib/time.js';
import { displayNumbers, displayValue, figureValue } from '../ledger/format.js';
import type { Effect, Figure, WorkingInput } from '../ledger/types.js';

const NUMERAL = /\d+(?:\.\d+)?/g;

/** Where a number comes from and what it is called. */
export interface Named {
  readonly id: string;
  readonly label: string;
  readonly unit?: string;
}

/** A labelled number with a fact-safe id: lower case kebab, label cut to fit. */
export function value(named: Named, amount: number): FactValue {
  const id = named.id.replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  return { id, label: named.label.slice(0, 120), value: amount, unit: named.unit ?? '' };
}

/** The numbers a cited fact carries: a number and its range ends, or the numerals in a quoted passage. */
export function cited(id: string): FactValue[] {
  const fact = findFact(id);
  if (fact === null) {
    return [];
  }
  if (fact.kind === 'number') {
    const ends = fact.range ? [fact.range.low, fact.range.high] : [];
    return [fact.value, ...ends].map((amount) => value({ id, label: fact.title, unit: fact.unit }, amount));
  }
  return [...fact.text.matchAll(NUMERAL)].map(([raw]) =>
    value({ id, label: fact.title, unit: 'in the quoted text' }, Number(raw)),
  );
}

/** A clock time as the numbers a reader may see: the 24 hour, the 12 hour and the minutes. */
export function clock(id: string, label: string, time: string): FactValue[] {
  const minutes = minutesOf(time);
  const hour = Math.floor(minutes / 60);
  return [hour, hour % 12 === 0 ? 12 : hour % 12, minutes % 60].map((amount) =>
    value({ id, label, unit: 'clock time' }, amount),
  );
}

/**
 * Working inputs as the model may quote them. Forecast concentrations are left out: prose speaks of the change
 * the forecast gives, and the modelled values stay in the working, one tap away.
 */
function quotable(id: string, inputs: readonly WorkingInput[]): FactValue[] {
  return inputs
    .filter((input) => input.from !== 'forecast')
    .map((input) => value({ id, label: input.label, unit: input.unit }, displayValue(input)));
}

/**
 * The numbers an effect shows, as displayed. Its working inputs stay in the working: the factors are in the facts
 * the item cites and the household's own values are sent once, so the model quotes the effect, not the sums.
 */
export function shown(id: string, effect: Effect): FactValue[] {
  return displayNumbers(effect).map((amount) => value({ id, label: `Shown figure for ${id}` }, amount));
}

/** The numbers a computed figure shows, signed and unsigned, and its quotable working inputs. */
export function figure(id: string, found: Figure): FactValue[] {
  const rounded = figureValue(found);
  return [
    value({ id, label: found.label, unit: found.unit }, rounded),
    value({ id, label: found.label, unit: found.unit }, Math.abs(rounded)),
    ...quotable(id, found.working.inputs),
  ];
}
