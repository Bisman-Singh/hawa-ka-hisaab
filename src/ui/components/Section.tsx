// A titled section of a page: its heading names it for assistive technology, then its content follows.
import { type ReactElement, type ReactNode, useId } from 'react';

/** Props of a section. level 3 is for sections inside a sheet or another section; className adds to "sec". */
export interface SectionProps {
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly level?: 2 | 3;
  readonly className?: string;
}

/** A section labelled by its own heading. */
export function Section({ title, children, level = 2, className }: SectionProps): ReactElement {
  const id = useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section className={className === undefined ? 'sec' : `sec ${className}`} aria-labelledby={id}>
      <Heading id={id}>{title}</Heading>
      {children}
    </section>
  );
}
