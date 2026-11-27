// A data credit as its licence asks for it: the credit line from the facts registry as a link to its source, and
// the licence it is given under. The words come from the registry; only licence names and links are held here.
import type { ReactElement } from 'react';
import { findFact } from '../../config/facts/index.js';
import type { Source } from '../../lib/types.js';

/** A licence a credited source is given under. */
export interface Licence {
  readonly name: string;
  readonly url: string;
}

const CC_BY: Licence = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };

/** The licence of each credited source that names one apart from its source link, by credit fact id. */
export const LICENCES: Readonly<Record<string, Licence>> = {
  'credit-open-meteo': CC_BY,
  'credit-cams': CC_BY,
  'credit-geonames': CC_BY,
};

/** The source a fact cites, such as the licence behind a credit. A missing id is a fault in the data and throws. */
export function factSource(id: string): Source {
  const fact = findFact(id);
  if (fact === null) {
    throw new Error(`no fact ${id}`);
  }
  return fact.source;
}

/**
 * One credit, inline and ending in one full stop: the credit line linked to its source, then any licence as a link.
 * A credit line that already ends with the licence name gives it once, as the link.
 */
export function Credit({ id }: { readonly id: string }): ReactElement | null {
  const fact = findFact(id);
  if (fact?.kind !== 'text') {
    return null;
  }
  const licence = LICENCES[id];
  const words = fact.text.replace(/\.$/, '');
  const named = licence !== undefined && words.endsWith(`, ${licence.name}`);
  return (
    <span className="credit">
      <a href={fact.source.url}>{named ? words.slice(0, -(licence.name.length + 2)) : words}</a>
      {licence === undefined ? null : (
        <>
          , <a href={licence.url}>{licence.name}</a>
        </>
      )}
      .
    </span>
  );
}
