// The page frame: skip link, header, main landmark and footer. Feature views sit inside main.
import type { ReactElement, ReactNode } from 'react';
import { APP_NAME } from '../../config/app.js';
import { ErrorBoundary } from './ErrorBoundary.js';

/** Props of the shell. children are the feature views. */
export interface AppShellProps {
  readonly children?: ReactNode;
}

/** The frame every view sits in. A failing view is caught inside main so the frame stays usable. */
export function AppShell({ children }: AppShellProps): ReactElement {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <h1 className="site-name">{APP_NAME}</h1>
      </header>
      <main id="main" tabIndex={-1} className="site-main">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <footer className="site-footer">
        <p>Sample households are made up.</p>
      </footer>
    </>
  );
}
