// Mounts a route from its contract: request limit, input check, handler, then a check of the response itself.
import type { Context } from 'hono';
import { routePath } from 'hono/route';
import { z } from 'zod';
import type { GetRoute, PostRoute, QueryValues } from '../lib/contract.js';
import { addressKey } from '../lib/rate-limit.js';
import type { Result } from '../lib/result.js';
import type { ApiFailure } from '../lib/types.js';
import { asClient } from './air/budget.js';
import type { MountTarget, ServerDeps } from './deps.js';
import { failure, sendFailure } from './errors.js';
import { readJsonBody, readQuery } from './validate.js';

/** What a handler knows about the request besides its input. clientKey is for the per-client model limit. */
export interface RequestMeta {
  readonly clientKey: string;
}

/** A route handler. Expected failures are returned, not thrown. */
export type RouteHandler<I, O> = (input: I, meta: RequestMeta) => Promise<Result<O, ApiFailure>>;

// The connection the local Node servers pass to the app, the only address there when no proxy sets a header.
const nodeConnection = z.object({ incoming: z.object({ socket: z.object({ remoteAddress: z.string() }) }) });

/**
 * Key for per-client limits. Vercel sets x-real-ip and overwrites any value a client sends. The dev and preview
 * servers have no proxy, so there the connection's own address is used. IPv6 is grouped by its /64 network.
 * Only a request with neither, such as one made in process, falls in the shared unknown bucket.
 */
export function clientKey(c: Context): string {
  const connection = nodeConnection.safeParse(c.env);
  const socket = connection.success ? connection.data.incoming.socket.remoteAddress : '';
  return addressKey(c.req.header('x-real-ip') ?? '') ?? addressKey(socket) ?? 'unknown';
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
  const seconds = String(reply.cacheSeconds);
  c.header(
    'Cache-Control',
    reply.cacheSeconds > 0 ? `public, max-age=${seconds}, s-maxage=${seconds}` : 'no-store',
  );
  return c.json(checked.data, 200);
}

/** A GET route as mounted. cacheFor, when given, sets the cache time of each answer, such as none for a degraded one. */
export interface MountedGetRoute<Q extends QueryValues, R> extends GetRoute<Q, R> {
  readonly cacheFor?: (body: R) => number;
}

// Runs the handler with the client key in scope, so every upstream call it causes is charged to that client.
function run<I, O>(c: Context, handle: RouteHandler<I, O>, input: I): Promise<Result<O, ApiFailure>> {
  const key = clientKey(c);
  return asClient(key, () => handle(input, { clientKey: key }));
}

/**
 * Registers a GET route. Query strings are checked with the contract before the handler sees them. An answer may
 * be kept by the browser and the host's CDN for cacheSeconds, which s-maxage asks of the CDN; errors never are.
 */
export function mountGet<Q extends QueryValues, R>(
  target: MountTarget,
  route: MountedGetRoute<Q, R>,
  handle: RouteHandler<Q, R>,
): void {
  target.app.get(route.path, async (c) => {
    const limited = await overLimit(c, target.deps);
    if (limited) {
      return limited;
    }
    const input = readQuery(c.req, route.query);
    const result = input.ok ? await run(c, handle, input.value) : input;
    const cacheSeconds = result.ok ? (route.cacheFor?.(result.value) ?? route.cacheSeconds) : 0;
    return send(c, target.deps, { schema: route.response, result, cacheSeconds });
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
    const result = input.ok ? await run(c, handle, input.value) : input;
    return send(c, target.deps, { schema: route.response, result, cacheSeconds: 0 });
  });
}
