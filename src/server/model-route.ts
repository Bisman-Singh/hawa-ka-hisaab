// What every model route shares: one short cache of checked replies per route, and the run handed to a model
// task, with the per-client limit taken only when the model is really asked and the route's deadline.
import { ROUTE_DEADLINE_MS } from '../config/limits.js';
import type { Checked, ModelRun } from '../features/assistant/guarded.js';
import {
  createReplyCache,
  MODEL_CACHE_ENTRIES,
  MODEL_CACHE_TTL_MS,
  type ReplyCache,
} from '../features/assistant/reply-cache.js';
import type { FallbackReason } from '../lib/types.js';
import type { ServerDeps } from './deps.js';
import type { RequestMeta } from './mount.js';

/** A route's dependencies with its own cache of checked replies. */
export interface ModelRoute<T> {
  readonly deps: ServerDeps;
  readonly path: string;
  readonly cache: ReplyCache<Checked<T>>;
}

/** Makes the shared parts of a model route. The cache lives as long as the server instance. */
export function createModelRoute<T>(deps: ServerDeps, path: string): ModelRoute<T> {
  const cache = createReplyCache<Checked<T>>({
    ttlMs: MODEL_CACHE_TTL_MS,
    maxEntries: MODEL_CACHE_ENTRIES,
    clock: deps.clock,
  });
  return { deps, path, cache };
}

/** The run for one request that started at startedAt, in epoch ms. */
export function runFor<T>(route: ModelRoute<T>, meta: RequestMeta, startedAt: number): ModelRun<T> {
  const { deps } = route;
  return {
    model: deps.model,
    allow: () => deps.modelLimiter.take(meta.clientKey),
    cache: route.cache,
    clock: deps.clock,
    deadline: startedAt + ROUTE_DEADLINE_MS,
  };
}

/** Logs that a route answered on its rules or fixed path, with the reason code only. */
export function logFallback(route: ModelRoute<unknown>, reason: FallbackReason | null): void {
  if (reason !== null) {
    route.deps.logger.warn('model_fallback', { route: route.path, code: reason });
  }
}
