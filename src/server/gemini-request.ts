// The request settings the Gemini adapter sends with each call, and how SDK errors map to model failure kinds.
import * as genai from '@google/genai';
import type { ModelFailure, ModelRequest } from '../lib/model.js';
import type { ModelFailureKind } from '../lib/types.js';
import { jsonSchemaFor, systemText } from './gemini-turns.js';

/** A failed call. next says whether the next model in the order is worth trying. */
export interface Miss extends ModelFailure {
  readonly next: boolean;
}

/** One call to one model. The marker is shared by every round and model of a generate call. */
export interface TurnSettings<T> {
  readonly request: ModelRequest<T>;
  readonly marker: string;
  readonly finalRound: boolean;
}

/** Most rounds of tool calls in one model turn; one answer-only round follows them. */
export const MAX_TOOL_ROUNDS = 2;

/** Most tool calls the model may ask for in one round. */
export const MAX_CALLS_PER_ROUND = 5;

/** Statuses after which the next model is tried: missing model, quota, server errors, overload and deadline. */
export const NEXT_MODEL_STATUS: ReadonlySet<number> = new Set([404, 429, 500, 502, 503, 504]);

const { HarmCategory: Harm, FunctionCallingConfigMode: Mode } = genai;
const SAFETY = [Harm.HARM_CATEGORY_HARASSMENT, Harm.HARM_CATEGORY_HATE_SPEECH].concat(
  Harm.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  Harm.HARM_CATEGORY_DANGEROUS_CONTENT,
);

/** Builds a failure. */
export const miss = (kind: ModelFailureKind, next = false): Miss => ({ kind, next });

/** A reply that did not parse, with its raw text, cut to the trace's limit, and the model that wrote it. */
export const unreadable = (rawText: string, modelId: string): Miss => ({
  ...miss('invalid_reply'),
  reply: { rawText: rawText.slice(0, 80_000), modelId },
});

/**
 * The config for one call: system text with the marker rules, JSON output against the reply schema, safety
 * settings, low thinking, a token cap, and no SDK retries, continuation or automatic tool calls. Tools are
 * declared only when the request has some; on the final round the model may no longer call them. No timeout is
 * set here: the SDK would send it as a server deadline, which the API refuses under 10 seconds, so the time limit
 * is an abort signal on the client instead.
 */
export function configFor<T>(turn: TurnSettings<T>): genai.GenerateContentConfig {
  const { tools } = turn.request;
  const functionDeclarations = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: jsonSchemaFor(tool.parameters),
  }));
  const mode = turn.finalRound ? Mode.NONE : Mode.AUTO;
  return {
    systemInstruction: systemText(turn.request.instructions, turn.marker),
    responseMimeType: 'application/json',
    responseJsonSchema: jsonSchemaFor(turn.request.schema),
    safetySettings: SAFETY.map((category) => ({
      category,
      threshold: genai.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    })),
    thinkingConfig: { thinkingLevel: genai.ThinkingLevel.LOW },
    maxOutputTokens: 4096,
    automaticFunctionCalling: { disable: true },
    automaticContinuation: false,
    ...(tools.length === 0
      ? {}
      : { tools: [{ functionDeclarations }], toolConfig: { functionCallingConfig: { mode } } }),
  };
}

/** Maps an SDK error: 429 is quota, an abort is a timeout, anything else is upstream. */
export function classify(error: unknown): Miss {
  if (error instanceof genai.ApiError) {
    return miss(error.status === 429 ? 'quota' : 'upstream', NEXT_MODEL_STATUS.has(error.status));
  }
  const name = error instanceof Error ? error.name : '';
  return miss(name === 'AbortError' || name === 'TimeoutError' ? 'timeout' : 'upstream');
}

/**
 * Runs a call with a signal that aborts it as a timeout after ms, and clears the timer once the call settles. The
 * SDK reads the whole body inside the call, so the limit covers the body too.
 */
export async function withinTime<T>(ms: number, call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('The model call ran out of time.', 'TimeoutError'));
  }, ms);
  try {
    return await call(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
