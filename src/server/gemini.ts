// The Gemini adapter behind the model port. Fixed instructions go in the system text and data in marked blocks;
// replies must parse with the request schema; only declared tools run; models are tried in order, once each.
import { randomUUID } from 'node:crypto';
import { GoogleGenAI, type Content } from '@google/genai';
import { MIN_MODEL_CALL_MS } from '../config/limits.js';
import type { ModelFailure, ModelPort, ModelReply } from '../lib/model.js';
import { err, ok, type Result } from '../lib/result.js';
import type { ToolCallRecord } from '../lib/types.js';
import { classify, configFor, MAX_CALLS_PER_ROUND, MAX_TOOL_ROUNDS, miss } from './gemini-request.js';
import { unreadable, withinTime, type Miss } from './gemini-request.js';
import { blocked, lastRound, noteFailure, resting, type QuotaPauses } from './gemini-limits.js';
import { callsIn, dataTurn, readReply, replyText, runToolCall, toolTurn } from './gemini-turns.js';
import type { Call, GeminiOptions } from './gemini-types.js';

/** The adapter's settings and fetch type, for callers that build it. */
export type { Fetch, GeminiOptions } from './gemini-types.js';

async function send<T>(
  call: Call<T>,
  contents: readonly Content[],
  round: number,
): Promise<Result<Content, Miss>> {
  const { deadline, options, request } = call;
  const stop = await blocked({
    deadline,
    clock: options.clock,
    callCap: options.callCap,
    budget: request.budget,
  });
  if (stop) {
    return err(stop);
  }
  try {
    const config = configFor({ request, marker: call.marker, finalRound: lastRound(request.budget, round) });
    const body = { model: call.model, contents: [...contents] };
    const response = await withinTime(deadline - options.clock.now(), (abortSignal) =>
      call.client.models.generateContent({ ...body, config: { ...config, abortSignal } }),
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
    const sent = await send(call, contents, round);
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
    if (calls.length > MAX_CALLS_PER_ROUND || lastRound(call.request.budget, round)) {
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
  paused: QuotaPauses,
): Promise<Result<ModelReply<T>, ModelFailure>> {
  let failure: ModelFailure = { kind: base.options.models.length === 0 ? 'upstream' : 'timeout' };
  const awake = base.options.models.filter((model) => !resting(paused, model, base.options.clock.now()));
  if (awake.length < base.options.models.length) {
    failure = { kind: 'quota' };
  }
  for (const model of awake) {
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
    noteFailure(paused, { model, kind: kept.kind, now });
    if (!next && kept.kind !== 'timeout') {
      break;
    }
  }
  return err(failure);
}

/**
 * Builds the Gemini port. The key goes only to the SDK, which sends it as a header. Nothing here logs. A quota,
 * overload, missing model, server error or a model's own time running out moves to the next model while enough
 * time is left; any other failure ends the call. A call ends by its own limit or the request's deadline. A model
 * that answered with a quota error rests for a minute. A request's budget is taken before every HTTP
 * call, and the round that spends its last call may not call tools.
 */
export function createGeminiModel(options: GeminiOptions): ModelPort {
  const paused: QuotaPauses = new Map();
  const client = new GoogleGenAI({
    apiKey: options.apiKey,
    httpOptions: options.fetch ? { fetch: options.fetch } : {},
  });
  return {
    modelId: options.models[0] ?? null,
    generate: (request) =>
      generateInOrder(
        {
          client,
          options,
          request,
          marker: randomUUID(),
          deadline: Math.min(options.clock.now() + options.timeoutMs, request.deadline ?? Infinity),
        },
        paused,
      ),
  };
}
