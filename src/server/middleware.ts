// Middleware for every API response: security headers, a last catch, same-origin only, body limit and a request log.
import type { MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { routePath } from 'hono/route';
import { API_HEADERS } from '../config/headers.js';
import { MAX_BODY_BYTES } from '../config/limits.js';
import type { ServerDeps } from './deps.js';
import { failure, sendFailure } from './errors.js';

/** Sets the API security headers after the handler runs, on errors as well as successes. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  for (const header of API_HEADERS) {
    c.res.headers.set(header.key, header.value);
  }
};

/** Refuses requests a browser marks as coming from another site. Tools that send no such header pass. */
export const sameOriginOnly: MiddlewareHandler = async (c, next) => {
  const site = c.req.header('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') {
    return sendFailure(c, failure('forbidden_origin'));
  }
  await next();
  return undefined;
};

/** Refuses bodies larger than MAX_BODY_BYTES, whether or not they declare a length. */
export const limitBody: MiddlewareHandler = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => sendFailure(c, failure('payload_too_large')),
});

/** Logs one line per request: the route pattern, method, status and duration. Never the path or body. */
export function requestLog(deps: ServerDeps): MiddlewareHandler {
  return async (c, next) => {
    const started = deps.clock.now();
    await next();
    deps.logger.info('request', {
      route: routePath(c, -1),
      method: c.req.method,
      status: c.res.status,
      durationMs: deps.clock.now() - started,
    });
  };
}

/**
 * Catches anything thrown that is not an Error, which Hono's error handler passes over, and answers with a plain
 * 500. The thrown value is never logged, since it could hold user text.
 */
export function catchThrown(deps: ServerDeps): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch {
      deps.logger.error('request_failed', {
        route: routePath(c, -1),
        method: c.req.method,
        errorName: 'non_error',
      });
      c.res = sendFailure(c, failure('internal'));
    }
  };
}
