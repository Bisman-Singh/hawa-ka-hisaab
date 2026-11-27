// The view registry: each screen folder owns its own list, so two people can add views without touching one file.
import { LEGAL_VIEWS } from './legal/views.js';
import { PLACE_VIEWS } from './place/views.js';
import { PLAN_VIEWS } from './plan/views.js';
import type { ViewDef } from './view-types.js';

/** Every view of the app, in page order. */
export const VIEWS: readonly ViewDef[] = [...PLACE_VIEWS, ...PLAN_VIEWS, ...LEGAL_VIEWS];
