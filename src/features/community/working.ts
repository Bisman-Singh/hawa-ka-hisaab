// The working behind a computed fact: terms entered, read from the forecast or cited from a fact, each with the
// fact value the number check needs, and the figure built from them.
import type { FactValue } from '../../lib/types.js';
import type { Figure, WorkingInput } from '../ledger/types.js';
import { factValue } from './facts.js';
import { formatNumber } from './format.js';

/** A computed fact with the fact values behind every number it carries. */
export interface FigureWithFacts {
  readonly figure: Figure;
  readonly facts: readonly FactValue[];
}

/** One input of a working with the fact value behind it. */
export interface Term {
  readonly input: WorkingInput;
  readonly fact: FactValue;
}

/** Everything a computed fact needs: its id and words, the value, the terms and the facts it cites. */
export interface FigureSpec {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly formula: string;
  readonly terms: readonly Term[];
  readonly factIds: readonly string[];
}

/** A term the society or school entered, marked as its own entry in the working. */
export function entered(id: string, [label, unit]: readonly [string, string], value: number): Term {
  return { input: { label, value, unit, from: 'community', factId: null }, fact: { id, label, value, unit } };
}

/** An hour of the cleaner window, taken from the model forecast. */
export const forecastHour = (label: string, value: number): Term => ({
  input: { label, value, unit: 'hour of day, IST', from: 'forecast', factId: null },
  fact: { id: 'forecast-cleaner-window', label, value, unit: 'hour' },
});

/** A term taken from a community number fact, naming it. */
export function cited(factId: string): Term {
  const fact = factValue(factId, 'value');
  return { input: { label: fact.label, value: fact.value, unit: fact.unit, from: 'fact', factId }, fact };
}

/** The figure and its fact values, with the value shown as the notice would write it. */
export function buildFigure(spec: FigureSpec): FigureWithFacts {
  const value = Number(formatNumber(spec.value));
  const working = {
    formula: spec.formula,
    inputs: spec.terms.map((term) => term.input),
    factIds: [...spec.factIds],
  };
  return {
    figure: { label: spec.label, value, unit: spec.unit, working },
    facts: [
      { id: spec.id, label: spec.label, value, unit: spec.unit },
      ...spec.terms.map((term) => term.fact),
    ],
  };
}
