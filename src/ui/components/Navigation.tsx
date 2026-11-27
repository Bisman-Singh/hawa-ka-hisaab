// Links between views and the heading every view opens with, which takes focus when the reader moves to it.
import { type MouseEvent, type ReactElement, type ReactNode, useEffect, useRef } from 'react';
import { hrefFor, useRoute } from '../router.js';

/** Props of a link to another view. */
export interface ViewLinkProps {
  readonly to: string;
  readonly children: ReactNode;
  readonly className?: string;
}

const isPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** A real link with a shareable address. A plain click moves in the page; a modified click opens a new tab. */
export function ViewLink({ to, children, className }: ViewLinkProps): ReactElement {
  const { navigate } = useRoute();
  const onClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (isPlainClick(event)) {
      event.preventDefault();
      navigate(to);
    }
  };
  return (
    <a href={hrefFor(to)} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** Props of a view's heading. hidden keeps it for screen readers only, for screens whose look has no title. */
export interface ViewHeadingProps {
  readonly children: ReactNode;
  readonly hidden?: boolean;
}

/** The h1 of a view. After a move between views it takes focus, so the reader starts at the new view. */
export function ViewHeading({ children, hidden = false }: ViewHeadingProps): ReactElement {
  const ref = useRef<HTMLHeadingElement>(null);
  const { moves } = useRoute();
  useEffect(() => {
    if (moves > 0) {
      ref.current?.focus();
    }
  }, [moves]);
  return (
    <h1 ref={ref} tabIndex={-1} className={hidden ? 'vh' : undefined}>
      {children}
    </h1>
  );
}
