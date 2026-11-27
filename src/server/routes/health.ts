// GET /api/health: says the API is up, reports its clock and which sources this instance is set up with.
import { healthRoute } from '../../lib/health.js';
import { ok } from '../../lib/result.js';
import type { HealthResponse } from '../../lib/types.js';
import type { RouteModule } from '../deps.js';
import { mountGet } from '../mount.js';

/**
 * Registers the health route. Anyone may call it, so it says only whether each source is set up, which the air
 * answers already show through their provider and the plan traces through their model path.
 */
export const registerHealth: RouteModule = (target) => {
  const { deps } = target;
  mountGet(target, healthRoute, () => {
    const body: HealthResponse = {
      status: 'ok',
      time: new Date(deps.clock.now()).toISOString(),
      sources: {
        cpcbFeed: deps.air.stationProviders.includes('cpcb_feed'),
        dataGovIn: deps.air.stationProviders.includes('data_gov_in'),
        model: deps.model.modelId !== null,
      },
    };
    return Promise.resolve(ok(body));
  });
};
