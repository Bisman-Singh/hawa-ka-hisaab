// Fake fetch functions and response builders for code that calls upstream services.
import type { Fetcher } from '../../src/lib/http.js';

/** One recorded call to a fake fetcher. */
export interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

/** A fetcher that answers from a function and records every call. */
export interface FakeFetcher {
  readonly fetch: Fetcher;
  readonly calls: readonly FetchCall[];
}

/** Creates a fetcher that answers each call with respond(url, init). */
export function createFakeFetcher(
  respond: (url: string, init: RequestInit) => Promise<Response>,
): FakeFetcher {
  const calls: FetchCall[] = [];
  return {
    calls,
    fetch: (url, init) => {
      calls.push({ url, init });
      return respond(url, init);
    },
  };
}

/** A response whose body arrives in the given chunks, as a real network body would. */
export function chunkedResponse(chunks: readonly string[], init: ResponseInit = {}): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, init);
}

/** A fetcher that never answers until the request is aborted, then rejects like a real fetch. */
export function hangingFetcher(): Fetcher {
  return (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
}
