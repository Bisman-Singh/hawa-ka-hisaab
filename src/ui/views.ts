// The view registry: every screen the frame can show, in page order. The first screen comes with the page; every
// other view loads on demand, so the code it needs stays out of the first screen's bundle.
import { type ComponentType, lazy } from 'react';
import { UI } from './components/words.js';
import { HomeView } from './place/HomeView.js';

/**
 * One view. id is its address, ?view=<id>, and home is the first screen. title fills the page title.
 * Component may be React.lazy for views that load on demand. footer lists the view in the footer links.
 */
export interface ViewDef {
  readonly id: string;
  readonly title: string;
  readonly Component: ComponentType;
  readonly footer?: boolean;
}

const onDemand = (load: () => Promise<ComponentType>): ComponentType =>
  lazy(() => load().then((Component) => ({ default: Component })));

const TITLES = UI.views;

/** Every view of the app, in page order. */
export const VIEWS: readonly ViewDef[] = [
  { id: 'home', title: TITLES.home, Component: HomeView },
  {
    id: 'household',
    title: TITLES.household,
    Component: onDemand(async () => (await import('./household/HouseholdView.js')).HouseholdView),
  },
  {
    id: 'plan',
    title: TITLES.plan,
    Component: onDemand(async () => (await import('./plan/PlanView.js')).PlanView),
  },
  {
    id: 'indoor',
    title: TITLES.indoor,
    Component: onDemand(async () => (await import('./indoor/IndoorView.js')).IndoorView),
  },
  {
    id: 'compare',
    title: TITLES.compare,
    Component: onDemand(async () => (await import('./compare/CompareView.js')).CompareView),
  },
  {
    id: 'community',
    title: TITLES.community,
    Component: onDemand(async () => (await import('./community/CommunityView.js')).CommunityView),
  },
  {
    id: 'privacy',
    title: TITLES.privacy,
    Component: onDemand(async () => (await import('./legal/PrivacyView.js')).PrivacyView),
    footer: true,
  },
  {
    id: 'about-data',
    title: TITLES['about-data'],
    Component: onDemand(async () => (await import('./legal/AboutDataView.js')).AboutDataView),
    footer: true,
  },
];
