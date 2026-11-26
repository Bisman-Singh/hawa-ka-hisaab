// The Gemini adapter behind the model port. Fixed instructions go in the system text and data in marked blocks;
// replies must parse with the request schema; only declared tools run; models are tried in order, once each.
import { randomUUID } from 'node:crypto';
import { GoogleGenAI, type Content } from '@google/genai';
import { MIN_MODEL_CALL_MS } from '../config/limits.js';
import type { Clock } from '../lib/clock.js';
import type { ModelFailure, ModelPort, ModelReply, ModelRequest } from '../lib/model.js';
import type { RateLimiter } from '../lib/rate-limit.js';
import { err, ok, type Result } from '../lib/result.js';
import type { ToolCallRecord } from '../lib/types.js';
import { classify, configFor, MAX_CALLS_PER_ROUND, MAX_TOOL_ROUNDS, miss } from './gemini-request.js';
import { unreadable, withinTime, type Miss } from './gemini-request.js';
import { callsIn, dataTurn, readReply, replyText, runToolCall, toolTurn } from './gemini-turns.js';

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

interface Call<T> {
  readonly client: GoogleGenAI;
  readonly options: GeminiOptions;
  readonly request: ModelRequest<T>;
  readonly model: string;
  readonly marker: string;
  readonly deadline: number;
}

async function send<T>(
  call: Call<T>,
  contents: readonly Content[],
  finalRound: boolean,
): Promise<Result<Content, Miss>> {
  const timeoutMs = call.deadline - call.options.clock.now();
  if (timeoutMs <= 0) {
    return err(miss('timeout'));
  }
  if (!(await call.options.callCap.take('model-calls')).allowed) {
    return err(miss('daily_cap'));
  }
  try {
    const config = configFor({ request: call.request, marker: call.marker, finalRound });
    const request = { model: call.model, contents: [...contents] };
    const response = await withinTime(timeoutMs, (abortSignal) =>
      call.client.models.generateContent({ ...request, config: { ...config, abortSignal } }),
    );
    const content = response.candidates?.[0]?.content;
    return content ? ok(content) : err(miss('invalid_reply'));
  } catch (error) {
    return err(classify(error));
  }
}

async function runModel<T>(call: Call<T>): Promise<Result<ModelReply<T>, Miss>> {
  const contents: Content[] = [dataTurn(call.request, call.marker)];
  const toolCalls: ToolCallRecord[] = [];
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const sent = await send(call, contents, round === MAX_TOOL_ROUNDS);
    if (!sent.ok) {
      return sent;
    }
    const calls = callsIn(sent.value);
    if (calls.length === 0) {
      const rawText = replyText(sent.value);
      const reply = readReply(call.request.schema, rawText);
      return reply
        ? ok({ value: reply.value, rawText, modelId: call.model, toolCalls })
        : err(unreadable(rawText, call.model));
    }
    if (calls.length > MAX_CALLS_PER_ROUND || round === MAX_TOOL_ROUNDS) {
      break;
    }
    const records = calls.map((functionCall) => runToolCall(call.request.tools, functionCall));
    toolCalls.push(...records);
    contents.push(sent.value, toolTurn(calls, records));
  }
  return err(miss('invalid_reply'));
}

async function generateInOrder<T>(
  base: Omit<Call<T>, 'model'>,
): Promise<Result<ModelReply<T>, ModelFailure>> {
  let failure: ModelFailure = { kind: base.options.models.length === 0 ? 'upstream' : 'timeout' };
  for (const model of base.options.models) {
    const now = base.options.clock.now();
    if (base.deadline - now < MIN_MODEL_CALL_MS) {
      break;
    }
    const deadline = Math.min(base.deadline, now + base.options.attemptMs);
    const result = await runModel({ ...base, model, deadline });
    if (result.ok) {
      return result;
    }
    const { next, ...kept } = result.error;
    failure = kept;
    if (!next && kept.kind !== 'timeout') {
      break;
    }
  }
  return err(failure);
}

/**
 * Builds the Gemini port. The key goes only to the SDK, which sends it as a header. Nothing here logs. A quota,
 * overload, missing model, server error or a model's own time running out moves to the next model while enough
 * time is left; any other failure ends the call. A call ends by its own limit or the request's deadline.
 */
export function createGeminiModel(options: GeminiOptions): ModelPort {
  const client = new GoogleGenAI({
    apiKey: options.apiKey,
    httpOptions: options.fetch ? { fetch: options.fetch } : {},
  });
  return {
    modelId: options.models[0] ?? null,
    generate: (request) =>
      generateInOrder({
        client,
        options,
        request,
        marker: randomUUID(),
        deadline: Math.min(options.clock.now() + options.timeoutMs, request.deadline ?? Infinity),
      }),
  };
}
