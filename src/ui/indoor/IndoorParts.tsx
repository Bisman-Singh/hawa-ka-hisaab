// Parts of the indoor view: a titled section, a list of sources, the purifier sum, a note and a swap.
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { displayValue, formatFigure } from '../../features/ledger/format.js';
import type { Figure } from '../../features/ledger/types.js';
import type { Alternative, IndoorStep } from '../../features/planner/types.js';
import { LeaderRows } from '../components/Ledger.js';
import { rowsOf, sumsOf } from '../plan/plan-data.js';
import { factsFor, SourceLine, Workings } from '../trace/Working.js';
import { INDOOR } from './strings.js';

/** The sources of a step or swap, each with a link. */
export function Sources({ ids }: { readonly ids: readonly string[] }): ReactElement {
  return (
    <ul className="cite" aria-label={INDOOR.sources}>
      {factsFor(ids).map((fact) => (
        <SourceLine key={typeof fact === 'string' ? fact : fact.id} fact={fact} />
      ))}
    </ul>
  );
}

/** A titled section of the view. */
export function Part({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  const id = useId();
  return (
    <section className="sec" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/** A figure worked as a column of sums: each input as the ledger shows it, then the total as the ledger formats it. */
export function Calc({ found }: { readonly found: Figure }): ReactElement {
  return (
    <LeaderRows
      kind="calc"
      rows={found.working.inputs.map((input) => ({
        label: input.label,
        figure: `${String(displayValue(input))} ${input.unit}`,
      }))}
      total={{ label: found.label, figure: formatFigure(found) }}
    />
  );
}

/** A purifier step: the sizing worked as a column of sums, then the advice and its sources. */
export function PurifierStep({ step }: { readonly step: IndoorStep }): ReactElement {
  return (
    <Part title={step.title}>
      {step.figure === null ? null : <Calc found={step.figure} />}
      <p>{step.detail}</p>
      <Sources ids={step.factIds} />
    </Part>
  );
}

/** A note: a home step or a corrected claim, with its figure and working where code computed one. */
export function Note({ step }: { readonly step: IndoorStep }): ReactElement {
  return (
    <li className={step.topic === 'myth' ? 'myth' : undefined}>
      <h3>{step.title}</h3>
      <p>{step.detail}</p>
      {step.figure === null && step.topic !== 'myth' ? <p className="small">{INDOOR.noFigure}</p> : null}
      {step.figure === null ? null : <Workings workings={[step.figure]} />}
      <Sources ids={step.factIds} />
    </li>
  );
}

/** An "instead of, do" pair with its sums, or the reason alone when no cited factor gives a number. */
export function Swap({ swap }: { readonly swap: Alternative }): ReactElement {
  const rows =
    swap.effect === null
      ? [{ label: INDOOR.effect, none: INDOOR.reasonOnly }]
      : rowsOf(sumsOf([swap.effect], false));
  return (
    <li>
      <dl className="pair">
        <dt>{INDOOR.instead}</dt>
        <dd className="from">{swap.instead}</dd>
        <dt>{INDOOR.doThis}</dt>
        <dd>{swap.doThis}</dd>
      </dl>
      <LeaderRows rows={rows} />
      <p>{swap.reason}</p>
      {swap.effect === null ? null : <Workings workings={[swap.effect]} />}
      <Sources ids={swap.factIds} />
    </li>
  );
}
