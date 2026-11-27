// The share of model HTTP calls one request may make, charged to the per-client limit call by call, so a client
// over its limit makes no call at all and a request that retries or falls back to another model stays bounded.
import type { CallBudget } from '../../lib/model.js';
import type { RateDecision } from '../../lib/rate-limit.js';

/** Most model HTTP calls one request may make, tool rounds, the retry and fallback models included. */
export const MAX_MODEL_CALLS_PER_REQUEST = 3;

/** A budget with open, which takes the first unit before the model is asked and says whether it was granted. */
export interface OpenBudget extends CallBudget {
  readonly open: () => Promise<boolean>;
}

/**
 * The budget for one request. The first unit is taken before the model is asked, so a client over its limit makes
 * no call; the adapter's first take uses that unit and every later HTTP call takes one more, up to the size.
 */
export function callBudget(allow: () => Promise<RateDecision>): OpenBudget {
  let used = 0;
  let reserved = false;
  const charge = async (): Promise<boolean> => {
    if (used >= MAX_MODEL_CALLS_PER_REQUEST || !(await allow()).allowed) {
      return false;
    }
    used += 1;
    return true;
  };
  return {
    open: async () => {
      reserved = await charge();
      return reserved;
    },
    take: async () => {
      if (reserved) {
        reserved = false;
        return true;
      }
      return charge();
    },
    left: () => MAX_MODEL_CALLS_PER_REQUEST - used,
  };
}
