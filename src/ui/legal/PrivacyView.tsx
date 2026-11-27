// The privacy page: what is sent where, Google's free tier terms in plain words, what is kept and where, the control
// that clears what this browser keeps, and how to get in touch.
import { useId } from 'react';
import type { ReactElement } from 'react';
import { ViewHeading } from '../components/Navigation.js';
import { ModelSwitch } from '../consent/ModelChoice.js';
import { ClearHousehold } from './ClearHousehold.js';
import { Lines, Part } from './parts.js';
import { GEMINI_TERMS_URL, ISSUES_URL, PRIVACY } from './strings.js';

/** How to get in touch: the repository's issue page, linked once its address is set. */
export function ContactLine({ url }: { readonly url: string | null }): ReactElement {
  return (
    <p>
      {PRIVACY.contactText} {url === null ? PRIVACY.contactLink : <a href={url}>{PRIVACY.contactLink}</a>}.
    </p>
  );
}

/** The privacy page. */
export function PrivacyView(): ReactElement {
  const id = useId();
  return (
    <div className="spread even">
      <div className="page-left">
        <ViewHeading>{PRIVACY.title}</ViewHeading>
        <p className="lede">{PRIVACY.lede}</p>
        <Part title={PRIVACY.sent}>
          <Lines lines={PRIVACY.sentLines} />
        </Part>
        <Part title={PRIVACY.google}>
          <p>
            {PRIVACY.googleTerms} <a href={GEMINI_TERMS_URL}>{PRIVACY.googleLink}</a>.
          </p>
          <p>{PRIVACY.googleAsk}</p>
        </Part>
      </div>
      <div className="page-right">
        <Part title={PRIVACY.kept}>
          <Lines lines={PRIVACY.keptLines} />
        </Part>
        <Part title={PRIVACY.model}>
          <ModelSwitch />
        </Part>
        <Part title={PRIVACY.clear}>
          <ClearHousehold id={id} />
        </Part>
        <Part title={PRIVACY.contact}>
          <ContactLine url={ISSUES_URL} />
        </Part>
      </div>
    </div>
  );
}
