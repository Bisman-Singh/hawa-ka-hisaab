// Builds the model port from the environment: the model order, the timeout and the daily cap on model calls.
// With no key, or a daily cap of 0, the disabled port answers and no network call is ever made.
import type { ServerEnv } from '../config/env.js';
import type { Clock } from '../lib/clock.js';
import { disabledModel, type ModelPort } from '../lib/model.js';
import { createFixedWindowLimiter } from '../lib/rate-limit.js';
import { err, ok, type Result } from '../lib/result.js';
import { createGeminiModel } from './gemini.js';

/** The order models are tried in when GEMINI_MODEL is unset, chosen from measured latency and success. */
export const DEFAULT_MODEL_ORDER: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
];

/** Time limit for one generate call, every tool round and fallback model included, in milliseconds. */
export const MODEL_TIMEOUT_MS = 15_000;

/**
 * Time limit for one model's turn in the order. Measured replies took 1 to 6 seconds; one live call hung past 15,
 * so a model that hangs gives the next one the rest of the time.
 */
export const MODEL_ATTEMPT_MS = 9000;

const DAY_MS = 86_400_000;
const MAX_MODELS = 8;
const MODEL_ID = /^[a-z0-9][a-z0-9.-]{0,63}$/;

/** Reads GEMINI_MODEL as a comma separated order, trimmed and without repeats. Unset gives the default order. */
export function parseModelOrder(value: string | null): Result<readonly string[], 'GEMINI_MODEL'> {
  if (value === null) {
    return ok(DEFAULT_MODEL_ORDER);
  }
  const models = [...new Set(value.split(',').map((part) => part.trim()))].filter((part) => part !== '');
  const valid =
    models.length > 0 && models.length <= MAX_MODELS && models.every((model) => MODEL_ID.test(model));
  return valid ? ok(models) : err('GEMINI_MODEL');
}

/**
 * The model port for the runtime. A bad model list stops startup naming the variable only. The daily cap counts
 * HTTP calls to the model in a 24 hour window that starts with the first call, per server instance.
 */
export function createModelFromEnv(env: ServerEnv, clock: Clock): ModelPort {
  const models = parseModelOrder(env.geminiModel);
  if (!models.ok) {
    throw new Error(`Invalid environment variables: ${models.error}`);
  }
  if (env.geminiApiKey === null || env.modelDailyCallCap === 0) {
    return disabledModel;
  }
  const callCap = createFixedWindowLimiter({
    limit: env.modelDailyCallCap,
    windowMs: DAY_MS,
    maxKeys: 1,
    clock,
  });
  return createGeminiModel({
    apiKey: env.geminiApiKey,
    models: models.value,
    timeoutMs: MODEL_TIMEOUT_MS,
    attemptMs: MODEL_ATTEMPT_MS,
    callCap,
    clock,
  });
}
