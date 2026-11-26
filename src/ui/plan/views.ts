// Views of the day plan, indoor air and swaps, compare, community and ask screens, in page order.
// Each loads on demand, so the planner code they need stays out of the first screen's bundle.
import { lazy } from 'react';
import type { ViewDef } from '../view-types.js';

const PlanView = lazy(() => import('./PlanView.js').then((module) => ({ default: module.PlanView })));
const IndoorView = lazy(() =>
  import('../indoor/IndoorView.js').then((module) => ({ default: module.IndoorView })),
);
const CompareView = lazy(() =>
  import('../compare/CompareView.js').then((module) => ({ default: module.CompareView })),
);
const CommunityView = lazy(() =>
  import('../community/CommunityView.js').then((module) => ({ default: module.CommunityView })),
);

/** Plan, indoor, compare and community views, each its own chunk loaded through React.lazy. */
export const PLAN_VIEWS: readonly ViewDef[] = [
  { id: 'plan', title: "Today's plan", Component: PlanView },
  { id: 'indoor', title: 'Indoor air and swaps', Component: IndoorView },
  { id: 'compare', title: 'Two households, the same air', Component: CompareView },
  { id: 'community', title: 'Society or school', Component: CommunityView },
];
