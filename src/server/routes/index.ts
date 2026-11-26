// The route registry. Each route file adds one import and one entry here.
import type { RouteModule } from '../deps.js';
import { registerHealth } from './health.js';

/** Every route module the app registers, in order. */
export const routeModules: readonly RouteModule[] = [registerHealth];
