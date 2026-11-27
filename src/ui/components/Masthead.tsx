// The masthead: the drawn mark, the wordmark in Hindi and English that leads home, and today's date in IST.
import type { ReactElement } from 'react';
import { APP_NAME } from '../../config/app.js';
import { UI } from './words.js';
import { HOME } from '../router.js';
import { ViewLink } from './Navigation.js';

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Asia/Kolkata' });
const day = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function Mark(): ReactElement {
  return (
    <svg className="mark" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <path d="M4 16L16 4M4 24L24 4M12 24L32 4M20 24L32 12" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 4H32V24H4Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M4 29H32M4 33H32" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** The banner at the top of every view. now is injected so the date can be tested. */
export function Masthead({ now }: { readonly now: Date }): ReactElement {
  return (
    <header className="masthead">
      <Mark />
      <ViewLink to={HOME} className="wordmark">
        <span className="hi" lang="hi">
          {UI.markHindi}
        </span>{' '}
        <span className="en">
          {APP_NAME}
          <span className="tag">{UI.markTag}</span>
        </span>
      </ViewLink>
      <p className="date">
        <b>{weekday.format(now)}</b>
        <span className="fig">{day.format(now)}</span>
      </p>
    </header>
  );
}
