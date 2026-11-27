// Labelled lines in the account book's style, as the two plain pages list what is sent and what is kept.
import type { ReactElement } from 'react';

/** One labelled line of a page: a short label and what it says. */
export interface Line {
  readonly label: string;
  readonly text: string;
}

/** Labelled lines, each a short label beside what it says. */
export function Lines({ lines }: { readonly lines: readonly Line[] }): ReactElement {
  return (
    <ul className="abstract">
      {lines.map((line) => (
        <li key={line.label}>
          <b>{line.label}</b>
          <span>{line.text}</span>
        </li>
      ))}
    </ul>
  );
}
