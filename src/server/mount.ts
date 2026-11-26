// Mounts a route from its contract: request limit, input check, handler, then a check of the response itself.
import type { Context } from 'hono';
import { routePath } from 'hono/route';
import type { z } from 'zod';
import type { GetRoute, PostRoute, QueryValues } from '../lib/contract.js';
import type { Result } from '../lib/result.js';
import type { ApiFailure } from '../lib/types.js';
import type { MountTarget, ServerDeps } from './deps.js';
import { failure, sendFailure } from './errors.js';
import { readJsonBody, readQuery } from './validate.js';

/** What a handler knows about the request besides its input. clientKey is for the per-client model limit. */
export interface RequestMeta {
  readonly clientKey: string;
}

/** A route handler. Expected failures are returned, not thrown. */
export type RouteHandler<I, O> = (input: I, meta: RequestMeta) => Promise<Result<O, ApiFailure>>;

/** Key for per-client limits. Vercel sets x-real-ip; without it every caller shares one bucket. */
export function clientKey(c: Context): string {
  return c.req.header('x-real-ip') ?? 'unknown';
}

async function overLimit(c: Context, deps: ServerDeps): Promise<Response | null> {
  const decision = await deps.requestLimiter.take(clientKey(c));
  if (decision.allowed) {
    return null;
  }
  c.header('Retry-After', String(decision.retryAfterSeconds));
  return sendFailure(c, failure('rate_limited'));
}

interface Reply<O> {
  readonly schema: z.ZodType<O>;
  readonly result: Result<O, ApiFailure>;
  readonly cacheSeconds: number;
}

function send<O>(c: Context, deps: ServerDeps, reply: Reply<O>): Response {
  if (!reply.result.ok) {
    return sendFailure(c, reply.result.error);
  }
  const checked = reply.schema.safeParse(reply.result.value);
  if (!checked.success) {
    deps.logger.error('response_invalid', { route: routePath(c), count: checked.error.issues.length });
    return sendFailure(c, failure('internal'));
  }
  const cache = reply.cacheSeconds > 0 ? `public, max-age=${String(reply.cacheSeconds)}` : 'no-store';
  c.header('Cache-Control', cache);
  return c.json(checked.data, 200);
}

/** Registers a GET route. Query strings are checked with the contract before the handler sees them. */
export function mountGet<Q extends QueryValues, R>(
  target: MountTarget,
  route: GetRoute<Q, R>,
  handle: RouteHandler<Q, R>,
): void {
  target.app.get(route.path, async (c) => {
    const limited = await overLimit(c, target.deps);
    if (limited) {
      return limited;
    }
    const input = readQuery(c.req, route.query);
    const result = input.ok ? await handle(input.value, { clientKey: clientKey(c) }) : input;
    return send(c, target.deps, { schema: route.response, result, cacheSeconds: route.cacheSeconds });
  });
}

/** Registers a POST route. The JSON body is checked with the contract before the handler sees it. */
export function mountPost<B, R>(
  target: MountTarget,
  route: PostRoute<B, R>,
  handle: RouteHandler<B, R>,
): void {
  target.app.post(route.path, async (c) => {
    const limited = await overLimit(c, target.deps);
    if (limited) {
      return limited;
    }
    const input = await readJsonBody(c.req, route.body);
    const result = input.ok ? await handle(input.value, { clientKey: clientKey(c) }) : input;
    return send(c, target.deps, { schema: route.response, result, cacheSeconds: 0 });
  });
}
