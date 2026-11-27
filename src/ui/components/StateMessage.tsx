// A message for a state of the page: empty, offline, stale, blocked, failed. Words and edge carry the state.
// An alert is announced when it appears; a status is read in place, as a live region added full is unreliable.
import type { ReactElement, ReactNode } from 'react';

/** The drawn sign beside a message. Each is a plain line drawing; struck through means not working. */
export type StateGlyph = 'start' | 'stale' | 'feed' | 'location' | 'offline' | 'model' | 'broken';

const STRIKE = 'M4 20L20 4';

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4' } satisfies Readonly<Record<2 | 3 | 4, 'h2' | 'h3' | 'h4'>>;

const GLYPHS: Readonly<Record<StateGlyph, readonly string[]>> = {
  start: ['M3 3h18v18H3z', 'M7 9h10M7 13h10M7 17h6'],
  stale: ['M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0', 'M12 7v5l3 2', STRIKE],
  feed: ['M3 9c5-4.5 13-4.5 18 0M6.5 12.5c3-2.7 8-2.7 11 0M10 16c1.2-1 2.8-1 4 0', STRIKE],
  location: ['M18.5 12a6.5 6.5 0 1 1-13 0a6.5 6.5 0 1 1 13 0', 'M12 2v4M12 18v4M2 12h4M18 12h4', STRIKE],
  offline: [
    'M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0',
    'M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20',
    STRIKE,
  ],
  model: ['M2 7h20v10H2z', 'M6 7v4M10 7v6M14 7v4M18 7v6'],
  broken: ['M3 3h18v18H3z', 'M7 9h10M7 13h4', STRIKE],
};

/** Props of a state message. quiet draws a dashed edge for calm states such as empty or offline. */
export interface StateMessageProps {
  readonly tone: 'alert' | 'status';
  readonly glyph: StateGlyph;
  readonly title: string;
  readonly children?: ReactNode;
  readonly quiet?: boolean;
  readonly level?: 2 | 3 | 4;
}

/** A ruled message box: a drawn sign, a short heading, then the body and any action buttons. */
export function StateMessage(props: StateMessageProps): ReactElement {
  const { tone, glyph, title, children, quiet = false, level = 3 } = props;
  const Heading = HEADINGS[level];
  return (
    <div role={tone === 'alert' ? 'alert' : undefined} className={quiet ? 'msg quiet' : 'msg'}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {GLYPHS[glyph].map((path) => (
          <path key={path} d={path} fill="none" stroke="currentColor" strokeWidth="2" />
        ))}
      </svg>
      <div>
        <Heading>{title}</Heading>
        {children}
      </div>
    </div>
  );
}
