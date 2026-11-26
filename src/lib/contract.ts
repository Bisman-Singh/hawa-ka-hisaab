// Route contracts. Each API route is one object naming its method, path, input schema and response schema.
// The server validates input and output with them, and the browser client validates responses with them.
import type { z } from 'zod';

/** Every API path starts with /api/. */
export type ApiPath = `/api/${string}`;

/** A flat query string value before it is turned into text. Booleans are left out because as text they parse wrong. */
export type QueryValue = string | number;

/** The parsed query of a GET route. Values are flat; nested data goes in a POST body. */
export type QueryValues = Readonly<Record<string, QueryValue>>;

/** A GET route. The query schema parses the raw strings of the URL, so it coerces numbers itself. */
export interface GetRoute<Q extends QueryValues, R> {
  readonly method: 'GET';
  readonly path: ApiPath;
  readonly query: z.ZodType<Q>;
  readonly response: z.ZodType<R>;
  readonly cacheSeconds: number;
}

/** A POST route with a JSON body. Responses are never cached. */
export interface PostRoute<B, R> {
  readonly method: 'POST';
  readonly path: ApiPath;
  readonly body: z.ZodType<B>;
  readonly response: z.ZodType<R>;
}

/** Declares a GET route and keeps its query and response types. */
export function defineGetRoute<Q extends QueryValues, R>(route: GetRoute<Q, R>): GetRoute<Q, R> {
  return route;
}

/** Declares a POST route and keeps its body and response types. */
export function definePostRoute<B, R>(route: PostRoute<B, R>): PostRoute<B, R> {
  return route;
}
