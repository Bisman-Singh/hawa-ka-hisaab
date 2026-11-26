// The route registry. Each route file adds one import and one entry here.
import type { RouteModule } from '../deps.js';
import { registerAir } from './air.js';
import { registerHealth } from './health.js';
import { registerPlaces } from './places.js';

/** Every route module the app registers, in order. */
export const routeModules: readonly RouteModule[] = [registerHealth, registerPlaces, registerAir];
