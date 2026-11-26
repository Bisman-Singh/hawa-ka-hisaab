// Typed API client built from the route contracts. Input is checked before sending and responses before use.
import { apiErrorBodySchema } from '../lib/api-error.js';
import type { GetRoute, PostRoute, QueryValues } from '../lib/contract.js';
import type { Fetcher } from '../lib/http.js';
import { err, ok, type Result } from '../lib/result.js';
import type { ApiErrorCode } from '../lib/types.js';
import type { z } from 'zod';

/** Why a call returned no usable data. network covers being offline. */
export type ApiCallFailure =
  | { readonly kind: 'invalid_input' }
  | { readonly kind: 'network' }
  | { readonly kind: 'aborted' }
  | { readonly kind: 'invalid_response'; readonly status: number }
  | { readonly kind: 'http'; readonly status: number }
  | {
      readonly kind: 'api';
      readonly status: number;
      readonly code: ApiErrorCode;
      readonly retryAfterSeconds: number | null;
    };

/** Options for one call. fetcher defaults to the browser's fetch. */
export interface CallOptions {
  readonly signal?: AbortSignal;
  readonly fetcher?: Fetcher;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    return undefined;
  }
}

function failureFrom(response: Response, body: unknown): ApiCallFailure {
  const parsed = apiErrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return { kind: 'http', status: response.status };
  }
  const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
  return {
    kind: 'api',
    status: response.status,
    code: parsed.data.error.code,
    retryAfterSeconds: Number.isNaN(retryAfter) ? null : retryAfter,
  };
}

interface Outgoing<R> {
  readonly url: string;
  readonly init: RequestInit;
  readonly schema: z.ZodType<R>;
}

async function read<R>(response: Response, schema: z.ZodType<R>, signal?: AbortSignal) {
  const body = await readJson(response);
  if (signal?.aborted) {
    return err<ApiCallFailure>({ kind: 'aborted' });
  }
  if (!response.ok) {
    return err(failureFrom(response, body));
  }
  const parsed = schema.safeParse(body);
  return parsed.success
    ? ok(parsed.data)
    : err<ApiCallFailure>({ kind: 'invalid_response', status: response.status });
}

async function send<R>({ url, init, schema }: Outgoing<R>, options: CallOptions) {
  const fetcher = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(url, { ...init, credentials: 'same-origin', signal: options.signal ?? null });
  } catch {
    return err<ApiCallFailure>({ kind: options.signal?.aborted ? 'aborted' : 'network' });
  }
  return read(response, schema, options.signal);
}

/** Calls a GET route. The query is turned into strings and checked with the same schema the server uses. */
export async function getJson<Q extends QueryValues, R>(
  route: GetRoute<Q, R>,
  query: Q,
  options: CallOptions = {},
): Promise<Result<R, ApiCallFailure>> {
  const params = Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)]));
  if (!route.query.safeParse(params).success) {
    return err({ kind: 'invalid_input' });
  }
  const search = new URLSearchParams(params).toString();
  const url = search ? `${route.path}?${search}` : route.path;
  return send({ url, init: { method: 'GET' }, schema: route.response }, options);
}

/** Calls a POST route with a JSON body, checked with the route's schema before it is sent. */
export async function postJson<B, R>(
  route: PostRoute<B, R>,
  body: B,
  options: CallOptions = {},
): Promise<Result<R, ApiCallFailure>> {
  if (!route.body.safeParse(body).success) {
    return err({ kind: 'invalid_input' });
  }
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
  return send({ url: route.path, init, schema: route.response }, options);
}
