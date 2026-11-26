// GET /api/places: places in India for a town, city or six digit PIN. An empty list means not found.
import { placesRoute } from '../../features/air/contract.js';
import { findPlaces } from '../../features/air/service.js';
import { err, ok } from '../../lib/result.js';
import type { RouteModule } from '../deps.js';
import { failure } from '../errors.js';
import { mountGet } from '../mount.js';

/** Registers the places route. A search that fails upstream is a 503 the page can retry. */
export const registerPlaces: RouteModule = (target) => {
  const { deps } = target;
  mountGet(target, placesRoute, async (query) => {
    const found = await findPlaces(deps.air, query.q);
    if (!found.ok) {
      deps.logger.warn('upstream_failed', { upstream: 'open-meteo', code: found.error.kind });
      return err(failure('upstream_unavailable'));
    }
    return ok({ places: found.value.slice(0, 10) });
  });
};
