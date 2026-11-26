// The route registry. Each route file adds one import and one entry here.
import type { RouteModule } from '../deps.js';
import { registerAir } from './air.js';
import { registerAsk } from './ask.js';
import { registerHealth } from './health.js';
import { registerIntake } from './intake.js';
import { registerNotice } from './notice.js';
import { registerPlaces } from './places.js';
import { registerPlan } from './plan.js';

/** Every route module the app registers, in order. */
export const routeModules: readonly RouteModule[] = [
  registerHealth,
  registerPlaces,
  registerAir,
  registerIntake,
  registerPlan,
  registerAsk,
  registerNotice,
];
