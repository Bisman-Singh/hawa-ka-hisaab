// Upstream fetch with a timeout and a response size bound. Failures come back as data, never as throws, and carry
// only a kind and a status: never the URL, which can hold a key, nor an error message that may quote it.
import type { z } from 'zod';
import { err, ok, type Result } from './result.js';

/** The fetch function the tools call. Production passes globalThis.fetch; tests pass a fake. */
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

/** One upstream call with its limits. */
export interface UpstreamRequest {
  readonly url: string;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Why an upstream call failed. over_budget means the call was not made, as its caller was over a call budget. */
export type HttpFailure =
  | { readonly kind: 'over_budget' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'network' }
  | { readonly kind: 'too_large' }
  | { readonly kind: 'status'; readonly status: number }
  | { readonly kind: 'invalid_body' };

async function discard(response: Response): Promise<void> {
  if (response.body) {
    await response.body.cancel();
  }
}

async function readBounded(response: Response, maxBytes: number): Promise<Result<string, HttpFailure>> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await discard(response);
    return err({ kind: 'too_large' });
  }
  if (!response.body) {
    return ok('');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  let chunk = await reader.read();
  while (!chunk.done) {
    total += chunk.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return err({ kind: 'too_large' });
    }
    text += decoder.decode(chunk.value, { stream: true });
    chunk = await reader.read();
  }
  return ok(text + decoder.decode());
}

/**
 * Fetches a URL as text. It aborts after timeoutMs and stops reading past maxBytes. A redirect is not followed, so
 * a query string never travels to another host; it is reported as its status.
 */
export async function fetchText(
  fetcher: Fetcher,
  request: UpstreamRequest,
): Promise<Result<string, HttpFailure>> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, request.timeoutMs);
  try {
    const response = await fetcher(request.url, {
      headers: { ...request.headers },
      redirect: 'manual',
      signal: controller.signal,
    });
    if (!response.ok) {
      await discard(response);
      return err({ kind: 'status', status: response.status });
    }
    return await readBounded(response, request.maxBytes);
  } catch {
    return err({ kind: controller.signal.aborted ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches a URL as JSON and validates it with the schema before anything uses it. */
export async function fetchJson<T>(
  fetcher: Fetcher,
  request: UpstreamRequest,
  schema: z.ZodType<T>,
): Promise<Result<T, HttpFailure>> {
  const text = await fetchText(fetcher, request);
  if (!text.ok) {
    return text;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(text.value));
    return parsed.success ? ok(parsed.data) : err({ kind: 'invalid_body' });
  } catch {
    return err({ kind: 'invalid_body' });
  }
}
