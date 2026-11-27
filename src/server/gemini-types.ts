// Types the Gemini adapter is built from: its settings and one call to one model. No runtime code.
import type { GoogleGenAI } from '@google/genai';
import type { Clock } from '../lib/clock.js';
import type { ModelRequest } from '../lib/model.js';
import type { RateLimiter } from '../lib/rate-limit.js';

/** A fetch function. Tests pass a scripted one; the runtime leaves it unset and the SDK uses the global fetch. */
export type Fetch = typeof globalThis.fetch;

/**
 * Settings for the adapter. models is the order to try. timeoutMs bounds a whole generate call, every round and
 * model included; attemptMs bounds one model's turn, so a model that hangs leaves time for the next one. callCap
 * is taken once per HTTP call to the model, which is what the daily cap counts.
 */
export interface GeminiOptions {
  readonly apiKey: string;
  readonly models: readonly string[];
  readonly timeoutMs: number;
  readonly attemptMs: number;
  readonly callCap: RateLimiter;
  readonly clock: Clock;
  readonly fetch?: Fetch | undefined;
}

/** One generate call to one model: the client, settings, request, model, marker and the deadline in epoch ms. */
export interface Call<T> {
  readonly client: GoogleGenAI;
  readonly options: GeminiOptions;
  readonly request: ModelRequest<T>;
  readonly model: string;
  readonly marker: string;
  readonly deadline: number;
}
