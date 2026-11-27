// The working behind a figure: its inputs, the formula in words, and the sources of its factors, each source once
// with the titles of the factors it backs and a link. The working is in English whatever the plan's language.
import type { ReactElement, ReactNode } from 'react';
import { findFact } from '../../config/facts/index.js';
import { displayValue } from '../../features/ledger/format.js';
import type { Effect, Figure, Working } from '../../features/ledger/types.js';
import type { Fact, Source } from '../../lib/types.js';
import { Disclosure } from '../components/Disclosure.js';
import { INPUT_FROM, TRACE } from './strings.js';

/** The facts with these ids from the registry, each once; an id with no record stays as an id. */
export function factsFor(ids: readonly string[]): (Fact | string)[] {
  return [...new Set(ids)].map((id) => findFact(id) ?? id);
}

/** One cited source and the titles of the facts it backs, or an id with no record, whose source is null. */
export interface SourceGroup {
  readonly key: string;
  readonly titles: string[];
  readonly source: Source | null;
}

/** The facts with these ids grouped by source, so a paper cited for several factors is listed once. */
export function sourceGroups(ids: readonly string[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  for (const fact of factsFor(ids)) {
    const key = typeof fact === 'string' ? fact : fact.source.url;
    const group = groups.get(key) ?? {
      key,
      titles: [],
      source: typeof fact === 'string' ? null : fact.source,
    };
    group.titles.push(typeof fact === 'string' ? fact : fact.title);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function SourceItem({ group }: { readonly group: SourceGroup }): ReactElement {
  const { source, titles } = group;
  if (source === null) {
    return (
      <li>
        {group.key}, {TRACE.noSource}.
      </li>
    );
  }
  return (
    <li>
      {titles.join('; ')}. <a href={source.url}>{source.title}</a>, {source.publisher}
      {source.published === null ? '.' : `, ${source.published}.`}
    </li>
  );
}

/** The sources of these facts as list items, each source once. Wrap them in the list that fits the page. */
export function SourceItems({ ids }: { readonly ids: readonly string[] }): ReactElement {
  return (
    <>
      {sourceGroups(ids).map((group) => (
        <SourceItem key={group.key} group={group} />
      ))}
    </>
  );
}

function Steps({ working }: { readonly working: Working }): ReactElement {
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
    </>
  );
}

/**
 * The working behind every figure shown: inputs and formula for each, then the sources of all of them, each once.
 * The summary is in the plan's language; the sheet is English.
 */
export function Workings({
  workings,
  summary,
}: {
  readonly workings: readonly (Effect | Figure)[];
  readonly summary?: ReactNode;
}): ReactElement | null {
  return workings.length === 0 ? null : (
    <Disclosure {...(summary === undefined ? {} : { summary })}>
      <div lang="en">
        {workings.map((found, index) => (
          <Steps key={index} working={found.working} />
        ))}
        <h4>{TRACE.sources}</h4>
        <ul>
          <SourceItems ids={workings.flatMap((found) => found.working.factIds)} />
        </ul>
      </div>
    </Disclosure>
  );
}
