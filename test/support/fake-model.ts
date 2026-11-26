// A scripted model port. Each call takes the next step; replies are checked with the request's schema, a reply
// that fails it keeps its raw text, and scripted tool calls run through the request's real tools, as the adapter does.
import type { JsonValue } from '../../src/lib/json.js';
import type { ModelPort, ModelRequest } from '../../src/lib/model.js';
import { err, ok } from '../../src/lib/result.js';
import type { ModelFailureKind, ToolCallRecord } from '../../src/lib/types.js';

/** A tool call the fake model makes before replying. */
export interface ScriptedToolCall {
  readonly name: string;
  readonly args: Readonly<Record<string, JsonValue>>;
}

/** One scripted step: a reply with optional tool calls, or a failure. */
export type ModelStep =
  | { readonly reply: JsonValue; readonly toolCalls?: readonly ScriptedToolCall[] }
  | { readonly failure: ModelFailureKind };

/** A fake model that records what it was asked. */
export interface FakeModel extends ModelPort {
  readonly requests: readonly ModelRequest<unknown>[];
}

function runTools(request: ModelRequest<unknown>, calls: readonly ScriptedToolCall[]): ToolCallRecord[] {
  return calls.map((call) => {
    const tool = request.tools.find((candidate) => candidate.name === call.name);
    if (!tool) {
      return { name: call.name, args: call.args, result: null, failure: 'unknown_tool' };
    }
    const outcome = tool.call(call.args);
    return outcome.ok
      ? { name: call.name, args: call.args, result: outcome.value, failure: null }
      : { name: call.name, args: call.args, result: null, failure: outcome.error };
  });
}

/** Creates a fake model. After the last step it keeps repeating that step. */
export function createFakeModel(steps: readonly ModelStep[], modelId = 'fake-model'): FakeModel {
  const requests: ModelRequest<unknown>[] = [];
  return {
    modelId,
    requests,
    generate(request) {
      requests.push(request);
      const step = steps[Math.min(requests.length, steps.length) - 1];
      if (!step) {
        return Promise.resolve(err({ kind: 'upstream' }));
      }
      if ('failure' in step) {
        return Promise.resolve(err({ kind: step.failure }));
      }
      const toolCalls = runTools(request, step.toolCalls ?? []);
      const parsed = request.schema.safeParse(step.reply);
      if (!parsed.success) {
        return Promise.resolve(
          err({ kind: 'invalid_reply', reply: { rawText: JSON.stringify(step.reply), modelId } }),
        );
      }
      return Promise.resolve(
        ok({ value: parsed.data, rawText: JSON.stringify(step.reply), modelId, toolCalls }),
      );
    },
  };
}
