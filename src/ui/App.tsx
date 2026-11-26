// The app: shared state, the router and the frame with every registered view.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { AppShell } from './components/AppShell.js';
import { RouterProvider } from './router.js';
import { AppStateProvider } from './state/app-state.js';
import type { ViewDef } from './view-types.js';
import { VIEWS } from './views.js';

/** Local storage, or null where the browser blocks it, as some private modes do. */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Props of the app. views defaults to the registry; tests and the component reference pass their own. */
export interface AppProps {
  readonly views?: readonly ViewDef[];
}

/** The whole page. */
export function App({ views = VIEWS }: AppProps): ReactElement {
  const [now] = useState(() => new Date());
  return (
    <AppStateProvider storage={browserStorage()}>
      <RouterProvider>
        <AppShell views={views} now={now} />
      </RouterProvider>
    </AppStateProvider>
  );
}
