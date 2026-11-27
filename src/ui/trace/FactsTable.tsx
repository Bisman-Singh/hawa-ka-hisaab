// The facts for the model as the "how this was made" sheet shows them: one row each, a clock time as one row.
import type { ReactElement } from 'react';
import { clockOf } from '../../features/ledger/format.js';
import type { FactValue, Trace } from '../../lib/types.js';
import { TRACE } from './strings.js';

/** A fact sent as the table shows it: its label, its value with the unit, and its id. */
export interface FactRow {
  readonly label: string;
  readonly value: string;
  readonly id: string;
}

/** Facts sent one after another for one clock time: an hour and a minute, or the 24 hour, 12 hour and minute. */
interface Group {
  readonly first: FactValue;
  readonly rest: FactValue[];
}

const PARTS: Readonly<Record<string, number>> = { hour: 1, 'clock time': 2 };

function joins({ first, rest }: Group, fact: FactValue): boolean {
  const unit = first.unit === 'hour' ? 'minute' : first.unit;
  const room = (PARTS[first.unit] ?? 0) > rest.length;
  return (
    room && fact.id === first.id && fact.unit === unit && (unit === 'minute' || fact.label === first.label)
  );
}

function rowOf({ first, rest }: Group): FactRow {
  const last = rest.at(-1);
  if (last !== undefined && rest.length === PARTS[first.unit]) {
    return {
      label: first.label.replace(/, hour$/, ''),
      value: clockOf(first.value * 60 + last.value),
      id: first.id,
    };
  }
  const values = [first, ...rest].map((fact) => String(fact.value)).join(', ');
  return {
    label: first.label,
    value: first.unit === 'name' ? values : `${values} ${first.unit}`,
    id: first.id,
  };
}

/**
 * The facts sent as table rows. The parts a clock time is sent as become one row with the time, and a number from
 * a name is shown without the unit "name", which only tells the number check what kind it is.
 */
export function factRows(facts: readonly FactValue[]): FactRow[] {
  const groups: Group[] = [];
  for (const fact of facts) {
    const group = groups.at(-1);
    if (group !== undefined && joins(group, fact)) {
      group.rest.push(fact);
    } else {
      groups.push({ first: fact, rest: [] });
    }
  }
  return groups.map(rowOf);
}

/** The facts sent to the model as a table, or a line saying none were sent. */
export function FactsTable({ trace }: { readonly trace: Trace }): ReactElement {
  if (trace.factsSent.length === 0) {
    return <p>{TRACE.noFacts}</p>;
  }
  return (
    <table className="facts">
      <caption className="vh">{TRACE.factsCaption}</caption>
      <thead>
        <tr>
          <th scope="col">{TRACE.factsHead.label}</th>
          <th scope="col">{TRACE.factsHead.value}</th>
          <th scope="col">{TRACE.factsHead.id}</th>
        </tr>
      </thead>
      <tbody>
        {factRows(trace.factsSent).map((row, index) => (
          <tr key={index}>
            <td>{row.label}</td>
            <td className="num">{row.value}</td>
            <td>{row.id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
