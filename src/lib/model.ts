// The model port: what code asks of a language model and what comes back. Adapters implement it.
// User text travels in data, never in instructions, and tools validate their arguments before running.
import type { z } from 'zod';
import { jsonValueSchema, type JsonValue } from './json.js';
import { err, ok, type Result } from './result.js';
import type { FactValue, ModelFailureKind, ToolCallRecord } from './types.js';

/** The jobs the model may be given. Arithmetic and facts are never among them. */
export type ModelTask = 'intake' | 'plan' | 'ask' | 'notice' | 'translate';

/** Why a tool call gave no result: no such tool, arguments that failed the schema, or a calculator that failed. */
export type ToolFailure = 'unknown_tool' | 'invalid_arguments' | 'failed';

/** A calculator the model may call. call validates the raw arguments, then runs the calculator. */
export interface ModelTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: z.ZodType;
  call(args: unknown): Result<JsonValue, ToolFailure>;
}

/** What to build a tool from: a name, a description, an argument schema and the calculator. */
export interface ToolSpec<A> {
  readonly name: string;
  readonly description: string;
  readonly parameters: z.ZodType<A>;
  readonly run: (args: A) => JsonValue;
}

function runChecked<A>(spec: ToolSpec<A>, args: A): Result<JsonValue, ToolFailure> {
  try {
    const result = jsonValueSchema.safeParse(spec.run(args));
    return result.success ? ok(result.data) : err('failed');
  } catch {
    return err('failed');
  }
}

/**
 * Builds a tool whose calculator only ever sees arguments that passed its schema. A result that is not plain
 * JSON, such as Infinity, and a calculator that throws both come back as failed, never as an exception.
 */
export function defineTool<A>(spec: ToolSpec<A>): ModelTool {
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    call(args) {
      const parsed = spec.parameters.safeParse(args);
      return parsed.success ? runChecked(spec, parsed.data) : err('invalid_arguments');
    },
  };
}

/**
 * One request to the model. The reply must parse with schema or the call fails as invalid_reply. deadline, in
 * epoch milliseconds, is when the caller stops waiting; the adapter ends the call by then or sooner.
 */
export interface ModelRequest<T> {
  readonly task: ModelTask;
  readonly instructions: string;
  readonly data: string;
  readonly facts: readonly FactValue[];
  readonly schema: z.ZodType<T>;
  readonly tools: readonly ModelTool[];
  readonly deadline?: number;
}

/** A validated model reply with the raw text and the tool calls that led to it. */
export interface ModelReply<T> {
  readonly value: T;
  readonly rawText: string;
  readonly modelId: string;
  readonly toolCalls: readonly ToolCallRecord[];
}

/**
 * A failed model call. Callers fall back to the rules path and say why. A reply that did not fit the schema keeps
 * its raw text and the model that wrote it, so the trace can show what came back.
 */
export interface ModelFailure {
  readonly kind: ModelFailureKind;
  readonly reply?: { readonly rawText: string; readonly modelId: string };
}

/** The model port. modelId is null when no model is configured. */
export interface ModelPort {
  readonly modelId: string | null;
  generate<T>(request: ModelRequest<T>): Promise<Result<ModelReply<T>, ModelFailure>>;
}

/** The port used when no key is set. Every call fails as disabled, so the rules path runs. */
export const disabledModel: ModelPort = {
  modelId: null,
  generate: () => Promise.resolve(err({ kind: 'disabled' })),
};
