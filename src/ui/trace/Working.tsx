// The working behind a figure: its inputs, the formula in words, and each factor with a link to its source.
import type { ReactElement } from 'react';
import { findFact } from '../../config/facts/index.js';
import { displayValue } from '../../features/ledger/format.js';
import type { Effect, Figure, Working } from '../../features/ledger/types.js';
import type { Fact } from '../../lib/types.js';
import { Disclosure } from '../components/Disclosure.js';
import { INPUT_FROM, TRACE } from './strings.js';

/** The facts with these ids, from the registry or the extra list given; an id with no record stays as an id. */
export function factsFor(ids: readonly string[], extra: readonly Fact[] = []): (Fact | string)[] {
  return [...new Set(ids)].map((id) => findFact(id) ?? extra.find((fact) => fact.id === id) ?? id);
}

/** One cited fact: its title, then the source title as a link and its publisher. */
export function SourceLine({ fact }: { readonly fact: Fact | string }): ReactElement {
  if (typeof fact === 'string') {
    return (
      <li>
        {fact}, {TRACE.noSource}.
      </li>
    );
  }
  const { source } = fact;
  return (
    <li>
      {fact.title}. <a href={source.url}>{source.title}</a>, {source.publisher}
      {source.published === null ? '.' : `, ${source.published}.`}
    </li>
  );
}

/** Props of a working sheet. extra holds facts outside the shared registry, such as community facts. */
export interface WorkingSheetProps {
  readonly working: Working;
  readonly extra?: readonly Fact[];
}

/** Inputs, formula and sources for one figure. Values are shown as the ledger displays them. */
export function WorkingSheet({ working, extra }: WorkingSheetProps): ReactElement {
  return (
    <>
      <h4>{TRACE.inputs}</h4>
      <ul>
        {working.inputs.map((input) => (
          <li key={`${input.label}-${String(input.value)}`}>
            {input.label}: {displayValue(input)} {input.unit}, {INPUT_FROM[input.from]}.
          </li>
        ))}
      </ul>
      <h4>{TRACE.formula}</h4>
      <p>{working.formula}</p>
      <h4>{TRACE.sources}</h4>
      <ul>
        {factsFor(working.factIds, extra).map((fact) => (
          <SourceLine key={typeof fact === 'string' ? fact : fact.id} fact={fact} />
        ))}
      </ul>
    </>
  );
}

/** Props of the workings: the figures shown, and facts outside the shared registry their sources may need. */
export interface WorkingsProps {
  readonly workings: readonly (Effect | Figure)[];
  readonly extra?: readonly Fact[];
}

/** The working behind every figure shown, one sheet after another. */
export function Workings({ workings, extra = [] }: WorkingsProps): ReactElement | null {
  return workings.length === 0 ? null : (
    <Disclosure>
      {workings.map((found, index) => (
        <WorkingSheet key={index} working={found.working} extra={extra} />
      ))}
    </Disclosure>
  );
}
