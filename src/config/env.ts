// Reads and checks the server environment. Values stay on the server and are never logged.
import { z } from 'zod';
import { err, ok, type Result } from '../lib/result.js';

const blankToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().min(1).optional());

const wholeNumber = (fallback: number, min: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().min(min).default(fallback));

const envSchema = z.object({
  GEMINI_API_KEY: optionalText,
  GEMINI_MODEL: optionalText,
  MODEL_DAILY_CALL_CAP: wholeNumber(200, 0),
  API_RATE_LIMIT_PER_MINUTE: wholeNumber(60, 1),
  MODEL_RATE_LIMIT_PER_MINUTE: wholeNumber(6, 0),
});

/**
 * Server settings read from the environment. A missing key means the rules path is used. A model limit or daily
 * cap of 0 turns model calls off; the request limit must be at least 1.
 */
export interface ServerEnv {
  readonly geminiApiKey: string | null;
  readonly geminiModel: string | null;
  readonly modelDailyCallCap: number;
  readonly apiRateLimitPerMinute: number;
  readonly modelRateLimitPerMinute: number;
}

/** Raw environment variables, such as process.env. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Parses the environment. On failure it returns only the names of the bad variables, never values. */
export function readServerEnv(source: EnvSource): Result<ServerEnv, readonly string[]> {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    return err(parsed.error.issues.map((issue) => issue.path.join('.')));
  }
  const env = parsed.data;
  return ok({
    geminiApiKey: env.GEMINI_API_KEY ?? null,
    geminiModel: env.GEMINI_MODEL ?? null,
    modelDailyCallCap: env.MODEL_DAILY_CALL_CAP,
    apiRateLimitPerMinute: env.API_RATE_LIMIT_PER_MINUTE,
    modelRateLimitPerMinute: env.MODEL_RATE_LIMIT_PER_MINUTE,
  });
}
