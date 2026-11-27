// The page frame: skip link, masthead, offline notice, the current view inside main, footer and live region.
// Each view is wrapped so a failing or loading view never takes the frame down with it.
import { type ReactElement, Suspense, useEffect } from 'react';
import { APP_NAME } from '../../config/app.js';
import { Announcer } from '../hooks/announcer.js';
import { useOnline } from '../hooks/useOnline.js';
import { UI } from './words.js';
import { useRoute } from '../router.js';
import type { ViewDef } from '../views.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { Footer } from './Footer.js';
import { Masthead } from './Masthead.js';
import { NOT_FOUND } from './NotFound.js';
import { StateMessage } from './StateMessage.js';

/** Props of the frame: the registered views and the time used for the masthead date. */
export interface AppShellProps {
  readonly views: readonly ViewDef[];
  readonly now: Date;
}

function Waiting(): ReactElement {
  return (
    <p className="status" role="status">
      {UI.loadingView}
    </p>
  );
}

function CurrentView({ views }: { readonly views: readonly ViewDef[] }): ReactElement {
  const { view } = useRoute();
  const current = views.find((candidate) => candidate.id === view) ?? NOT_FOUND;
  useEffect(() => {
    document.title = `${current.title}. ${APP_NAME}`;
  }, [current.title]);
  const View = current.Component;
  return (
    <ErrorBoundary key={current.id}>
      <Suspense fallback={<Waiting />}>
        <View />
      </Suspense>
    </ErrorBoundary>
  );
}

/** The frame every view sits in. */
export function AppShell({ views, now }: AppShellProps): ReactElement {
  const online = useOnline();
  return (
    <Announcer>
      <a className="skip" href="#main">
        {UI.skip}
      </a>
      <div className="wrap">
        <Masthead now={now} />
        {online ? null : (
          <StateMessage tone="status" glyph="offline" title={UI.offline.title} quiet level={2}>
            <p>{UI.offline.body}</p>
          </StateMessage>
        )}
        <main id="main" tabIndex={-1}>
          <CurrentView views={views} />
        </main>
        <Footer links={views.filter((view) => view.footer === true)} />
      </div>
    </Announcer>
  );
}
