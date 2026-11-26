// Error responses. Clients get a code and a plain message; stack traces and internals never leave the server.
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorCode, ApiFailure } from '../lib/types.js';

/** The HTTP status sent with each error code. */
export const API_ERROR_STATUS: Readonly<Record<ApiErrorCode, ContentfulStatusCode>> = {
  invalid_request: 400,
  forbidden_origin: 403,
  not_found: 404,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  internal: 500,
  upstream_unavailable: 503,
};

const MESSAGES: Readonly<Record<ApiErrorCode, string>> = {
  invalid_request: 'The request did not match the expected shape.',
  unsupported_media_type: 'Send the body as JSON with Content-Type application/json.',
  payload_too_large: 'The request body is too large.',
  forbidden_origin: 'Requests from other sites are not accepted.',
  not_found: 'There is nothing at this address.',
  rate_limited: 'Too many requests. Wait a moment and try again.',
  upstream_unavailable: 'A data source did not answer. Try again shortly.',
  internal: 'Something went wrong on our side. Try again shortly.',
};

/** Builds a failure with the standard message for its code and no validation issues. */
export function failure(code: ApiErrorCode): ApiFailure {
  return { code, message: MESSAGES[code], issues: [] };
}

/**
 * Sends a failure as the standard error body with the status for its code. Text is cut to the limits of the
 * error schema so the client can always read the code. Errors are never cached.
 */
export function sendFailure(c: Context, body: ApiFailure): Response {
  c.header('Cache-Control', 'no-store');
  const issues = body.issues.slice(0, 20).map((issue) => ({
    path: issue.path.slice(0, 200),
    message: issue.message.slice(0, 200),
  }));
  return c.json(
    { error: { code: body.code, message: body.message.slice(0, 200), issues } },
    API_ERROR_STATUS[body.code],
  );
}
