// One printed notice: the title, the opening line with the reading, a numbered line per action, the closing and
// the credits; and the copy that puts its plain text on the clipboard.
import type { ReactElement } from 'react';
import { APP_NAME } from '../../config/app.js';
import type { NoticeText } from '../../features/community/types.js';
import type { Language } from '../../lib/types.js';
import { airQuote } from '../plan/air-basis.js';
import { COMMUNITY } from './strings.js';

/** Copies text to the clipboard. The promise settles false where the browser refuses or has no clipboard. */
export function copyText(text: string): Promise<boolean> {
  return Promise.resolve()
    .then(() => navigator.clipboard.writeText(text))
    .then(
      () => true,
      () => false,
    );
}

/** One notice: title, the opening with the reading, a numbered line per action, the closing and the credits. */
export function NoticeCard({
  text,
  language,
  label,
  skip = false,
}: {
  readonly text: NoticeText;
  readonly language: Language;
  readonly label: string;
  readonly skip?: boolean;
}): ReactElement {
  const { lines } = text;
  const last = Math.max(1, lines.length - 1);
  return (
    <article className={skip ? 'notice no-print' : 'notice'} lang={language} aria-label={label}>
      <p className="notice-title">{text.title}</p>
      <div className="notice-air">
        {lines.slice(0, 1).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <ol>
        {lines.slice(1, last).map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
      {lines.slice(last).map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="src" lang="en">
        {`${airQuote('credit-cpcb')} ${airQuote('credit-open-meteo')}. ${COMMUNITY.madeWith} ${APP_NAME}.`}
      </p>
    </article>
  );
}
