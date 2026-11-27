// A native disclosure for the working behind a figure: a summary line that opens a ruled sheet.
import type { ReactElement, ReactNode } from 'react';
import { UI } from './words.js';

/** Props of a disclosure. summary defaults to "Show the working". open sets the first state only. */
export interface DisclosureProps {
  readonly children: ReactNode;
  readonly summary?: ReactNode;
  readonly open?: boolean;
}

/** details and summary: Enter and Space toggle it, and the open state is announced by the browser. */
export function Disclosure({ children, summary = UI.working, open = false }: DisclosureProps): ReactElement {
  return (
    <details className="working" open={open}>
      <summary>{summary}</summary>
      <div className="sheet">{children}</div>
    </details>
  );
}
