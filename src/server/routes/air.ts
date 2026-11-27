// GET /api/air: the air card for a point in India from the CPCB feed, the model forecast and the GRAP order.
import { airRoute } from '../../features/air/contract.js';
import { readAir } from '../../features/air/service.js';
import type { AirResponse } from '../../features/air/types.js';
import { ok } from '../../lib/result.js';
import type { RouteModule } from '../deps.js';
import { mountGet } from '../mount.js';

/**
 * Cache time of an answer. One built while a source failed is not kept anywhere, so a person's Try again reaches
 * the server, whose own caches decide whether the upstream is asked again.
 */
export function airCacheSeconds(body: AirResponse): number {
  return body.feed.fetch === 'ok' && body.forecast !== null ? airRoute.cacheSeconds : 0;
}

/** Registers the air route. A source that fails is a state of the answer and a log line, never an error. */
export const registerAir: RouteModule = (target) => {
  const { deps } = target;
  mountGet(target, { ...airRoute, cacheFor: airCacheSeconds }, async (query) => {
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
