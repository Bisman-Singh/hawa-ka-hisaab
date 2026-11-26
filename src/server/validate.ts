// Request validation built on zod. Issues name the schema field and the rule; text the client sent is not repeated.
import type { HonoRequest } from 'hono';
import type { z } from 'zod';
import { err, ok, type Result } from '../lib/result.js';
import type { ApiFailure } from '../lib/types.js';
import { failure } from './errors.js';

const MAX_ISSUES = 20;
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]{0,40}$/;

function segment(part: PropertyKey): string {
  if (typeof part === 'number') {
    return String(part);
  }
  return typeof part === 'string' && FIELD_NAME.test(part) ? part : '*';
}

function describe(issue: z.core.$ZodIssue): { path: string; message: string } {
  return {
    path: issue.path.map(segment).join('.').slice(0, 200) || '(root)',
    message: issue.code === 'unrecognized_keys' ? 'Unexpected field.' : issue.message.slice(0, 200),
  };
}

/**
 * Checks a value against a schema and turns zod issues into the API's issue list. Unexpected field names are not
 * repeated, because zod's own message would echo them, and path parts that do not look like field names are masked.
 */
export function checkInput<T>(schema: z.ZodType<T>, value: unknown): Result<T, ApiFailure> {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return ok(parsed.data);
  }
  return err({
    ...failure('invalid_request'),
    issues: parsed.error.issues.slice(0, MAX_ISSUES).map(describe),
  });
}

/** Reads the query string of a GET request and checks it. */
export function readQuery<T>(request: HonoRequest, schema: z.ZodType<T>): Result<T, ApiFailure> {
  return checkInput(schema, request.query());
}

/** Reads a JSON body and checks it. Other content types are refused, which also blocks simple cross-site posts. */
export async function readJsonBody<T>(
  request: HonoRequest,
  schema: z.ZodType<T>,
): Promise<Result<T, ApiFailure>> {
  const contentType = request.header('content-type') ?? '';
  if (!/^application\/json(\s*;|$)/i.test(contentType)) {
    return err(failure('unsupported_media_type'));
  }
  try {
    return checkInput(schema, await request.json<unknown>());
  } catch {
    return err({ ...failure('invalid_request'), message: 'The body is not valid JSON.' });
  }
}
