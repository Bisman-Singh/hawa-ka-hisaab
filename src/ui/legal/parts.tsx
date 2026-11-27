// Parts the two plain pages share: a titled section and a list of labelled lines in the account book's style.
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Line } from './strings.js';

/** A section with its own heading. */
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
