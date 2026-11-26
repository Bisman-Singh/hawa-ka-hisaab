// GET /api/health: says the API is up and reports its clock.
import { healthRoute } from '../../lib/health.js';
import { ok } from '../../lib/result.js';
import type { HealthResponse } from '../../lib/types.js';
import type { RouteModule } from '../deps.js';
import { mountGet } from '../mount.js';

/** Registers the health route. */
export const registerHealth: RouteModule = (target) => {
  mountGet(target, healthRoute, () => {
    const body: HealthResponse = { status: 'ok', time: new Date(target.deps.clock.now()).toISOString() };
    return Promise.resolve(ok(body));
  });
};
