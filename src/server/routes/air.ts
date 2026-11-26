// GET /api/air: the air card for a point in India from the CPCB feed, the model forecast and the GRAP order.
import { airRoute } from '../../features/air/contract.js';
import { readAir } from '../../features/air/service.js';
import { ok } from '../../lib/result.js';
import type { RouteModule } from '../deps.js';
import { mountGet } from '../mount.js';

/** Registers the air route. A source that fails is a state of the answer and a log line, never an error. */
export const registerAir: RouteModule = (target) => {
  const { deps } = target;
  mountGet(target, airRoute, async (query) => {
    const body = await readAir(deps.air, deps.clock, { lat: query.lat, lon: query.lon });
    if (body.feed.fetch === 'failed') {
      deps.logger.warn('upstream_failed', { upstream: 'cpcb' });
    }
    if (body.forecast === null) {
      deps.logger.warn('upstream_failed', { upstream: 'open-meteo' });
    }
    return ok(body);
  });
};
