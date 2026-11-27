// Parts of the indoor view: a titled section, a list of sources, the purifier sum, a note and a swap. Text the plan
// wrote carries the plan's language; labels, sums and sources are English.
import type { ReactElement } from 'react';
import { displayValue, formatFigure } from '../../features/ledger/format.js';
import type { Figure } from '../../features/ledger/types.js';
import type { Alternative, IndoorStep } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { LeaderRows } from '../components/Ledger.js';
import { Section } from '../components/Section.js';
import { amountText } from '../components/words.js';
import { rowsOf, sumsOf } from '../plan/plan-data.js';
import { SourceItems, Workings } from '../trace/Working.js';
import { INDOOR } from './words.js';

/** The sources of a step or swap, each with a link. */
export function Sources({ ids }: { readonly ids: readonly string[] }): ReactElement {
  return (
    <ul className="cite" aria-label={INDOOR.sources}>
      <SourceItems ids={ids} />
    </ul>
  );
}

/** A figure worked as a column of sums: each input as the ledger shows it, then the total as the ledger formats it. */
export function Calc({ found }: { readonly found: Figure }): ReactElement {
  return (
    <LeaderRows
      kind="calc"
      rows={found.working.inputs.map((input) => ({
        label: input.label,
        figure: amountText(displayValue(input), input.unit),
      }))}
      total={{ label: found.label, figure: formatFigure(found) }}
    />
  );
}

/** A step and the language the plan wrote it in. */
export interface StepProps {
  readonly step: IndoorStep;
  readonly language: Language;
}

/** A purifier step: the sizing worked as a column of sums, then the advice and its sources. */
export function PurifierStep({ step, language }: StepProps): ReactElement {
  return (
    <Section title={<span lang={language}>{step.title}</span>}>
      {step.figure === null ? null : <Calc found={step.figure} />}
      <p lang={language}>{step.detail}</p>
      <Sources ids={step.factIds} />
    </Section>
  );
}

/** A note: a home step or a corrected claim, with its figure and working where code computed one. */
export function Note({ step, language }: StepProps): ReactElement {
  return (
    <li className={step.topic === 'myth' ? 'myth' : undefined}>
      <h3 lang={language}>{step.title}</h3>
      <p lang={language}>{step.detail}</p>
      {step.figure === null && step.topic !== 'myth' ? <p className="small">{INDOOR.noFigure}</p> : null}
      {step.figure === null ? null : <Workings workings={[step.figure]} />}
      <Sources ids={step.factIds} />
    </li>
  );
}

/** An "instead of, do" pair with its sums, or the reason alone when no cited factor gives a number. */
export function Swap({
  swap,
  language,
}: {
  readonly swap: Alternative;
  readonly language: Language;
}): ReactElement {
  const rows =
    swap.effect === null
      ? [{ label: INDOOR.effect, none: INDOOR.reasonOnly }]
      : rowsOf(sumsOf([swap.effect], false));
  return (
    <li>
      <dl className="pair">
        <dt>{INDOOR.instead}</dt>
        <dd className="from" lang={language}>
          {swap.instead}
        </dd>
        <dt>{INDOOR.doThis}</dt>
        <dd lang={language}>{swap.doThis}</dd>
      </dl>
      <LeaderRows rows={rows} />
      <p lang={language}>{swap.reason}</p>
      {swap.effect === null ? null : <Workings workings={[swap.effect]} />}
      <Sources ids={swap.factIds} />
    </li>
  );
}
