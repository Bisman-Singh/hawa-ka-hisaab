// The Hono app factory. It takes every dependency as an argument so tests can pass fakes.
import { Hono } from 'hono';
import { routePath } from 'hono/route';
import type { ServerDeps } from './deps.js';
import { failure, sendFailure } from './errors.js';
import { catchThrown, limitBody, requestLog, sameOriginOnly, securityHeaders } from './middleware.js';
import { routeModules } from './routes/index.js';

/** Builds the API with its middleware, every registered route and the error handlers. */
export function createApp(deps: ServerDeps): Hono {
  const app = new Hono();
  app.use('*', securityHeaders);
  app.use('*', catchThrown(deps));
  app.use('*', requestLog(deps));
  app.use('/api/*', sameOriginOnly);
  app.use('/api/*', limitBody);
  for (const register of routeModules) {
    register({ app, deps });
  }
  app.notFound((c) => sendFailure(c, failure('not_found')));
  app.onError((error, c) => {
    deps.logger.error('request_failed', {
      route: routePath(c, -1),
      method: c.req.method,
      errorName: error.name,
    });
    return sendFailure(c, failure('internal'));
  });
  return app;
}
