// The app: the shell with the feature views in page order. Each view stream adds its view here.
import type { ReactElement } from 'react';
import { AppShell } from './components/AppShell.js';

/** The whole page. */
export function App(): ReactElement {
  return <AppShell />;
}
