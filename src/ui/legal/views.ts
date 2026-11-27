// Views of the plain pages linked from the footer: privacy, and where the data comes from. Each loads on demand.
import { lazy } from 'react';
import type { ViewDef } from '../view-types.js';

const PrivacyView = lazy(() =>
  import('./PrivacyView.js').then((module) => ({ default: module.PrivacyView })),
);
const AboutDataView = lazy(() =>
  import('./AboutDataView.js').then((module) => ({ default: module.AboutDataView })),
);

/** The privacy and about-the-data pages, listed in the footer. */
export const LEGAL_VIEWS: readonly ViewDef[] = [
  { id: 'privacy', title: 'Privacy', Component: PrivacyView, footer: true },
  { id: 'about-data', title: 'About the data', Component: AboutDataView, footer: true },
];
