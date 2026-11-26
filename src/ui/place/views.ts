// Views of the place, air card, household intake and household form screens, in page order.
import { lazy } from 'react';
import type { ViewDef } from '../view-types.js';
import { HomeView } from './HomeView.js';

const HouseholdView = lazy(() =>
  import('../household/HouseholdView.js').then((module) => ({ default: module.HouseholdView })),
);

/** Place and household views. The first screen takes the id home; the household form loads on demand. */
export const PLACE_VIEWS: readonly ViewDef[] = [
  { id: 'home', title: "Today's air for your place", Component: HomeView },
  { id: 'household', title: 'Your household', Component: HouseholdView },
];
