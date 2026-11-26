// A scripted fetch for the Gemini adapter tests: canned API responses, and a record of every request the SDK sent.
import { vi, type Mock } from 'vitest';
import { z } from 'zod';

/** One request the SDK sent: its URL, headers and parsed JSON body. */
export interface Sent {
  readonly url: string;
  readonly headers: Headers;
  readonly body: Record<string, unknown>;
}

/** Answers one request. */
export type Respond = (sent: Sent) => Response | Promise<Response>;

/** A JSON response with the given status. */
export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A model turn holding one text part. */
export const textReply = (text: string, extra: Record<string, unknown> = {}): Response =>
  json({ candidates: [{ content: { role: 'model', parts: [{ text, ...extra }] } }] });

/** A model turn asking for function calls, each with a thought signature. */
export const callReply = (calls: readonly Record<string, unknown>[]): Response =>
  json({
    candidates: [
      {
        content: {
          role: 'model',
          parts: calls.map((call, index) => ({
            functionCall: call,
            thoughtSignature: `sig-${String(index)}`,
          })),
        },
      },
    ],
  });

/** An API error body with its status. */
export const apiError = (status: number, code: string): Response =>
  json({ error: { code: status, message: 'scripted failure', status: code } }, status);

/** A fetch mock with the signature the SDK calls. */
export type FetchMock = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

/** A fetch that answers with the steps in order, repeating the last, and records what was sent. */
export function scripted(steps: readonly Respond[]): {
  readonly fetch: FetchMock;
  readonly sent: readonly Sent[];
} {
  const sent: Sent[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const bodyText = typeof init?.body === 'string' ? init.body : '{}';
    const parsed = z.record(z.string(), z.unknown()).parse(JSON.parse(bodyText));
    const entry = { url, headers: new Headers(init?.headers), body: parsed };
    sent.push(entry);
    const step = steps[Math.min(sent.length, steps.length) - 1];
    return step ? step(entry) : apiError(500, 'INTERNAL');
  });
  return { fetch, sent };
}
