// The trace behind every model task and fixed reply: who produced it, the facts sent, the raw reply, the tool
// calls and the number check, cut to the limits of the trace schema.
import type { ModelReply } from '../../lib/model.js';
import type { FactValue, FallbackReason, NumberCheck, Trace } from '../../lib/types.js';
import type { NumberVerdict } from './number-guard.js';

/** What the model wrote, as far as the trace shows it. modelId is null when no model answered. */
export type Written = Pick<ModelReply<unknown>, 'rawText' | 'toolCalls'> & {
  readonly modelId: string | null;
};

/** The parts a trace is built from besides the facts. reason is null when the model's reply was used. */
export interface TraceParts {
  readonly reason: FallbackReason | null;
  readonly reply: Written | null;
  readonly check: NumberCheck;
}

/** A trace from its parts, every list and text cut to the trace schema's limits. */
export function traceOf(facts: readonly FactValue[], parts: TraceParts): Trace {
  return {
    producedBy: parts.reason === null ? 'model' : 'rules',
    modelId: parts.reply?.modelId ?? null,
    fallbackReason: parts.reason,
    factsSent: facts.slice(0, 500),
    modelReply: parts.reply?.rawText.slice(0, 80_000) ?? null,
    toolCalls: parts.reply?.toolCalls.slice(0, 20) ?? [],
    numberCheck: parts.check,
    cached: false,
  };
}

/** The number check as the trace shows it: not run when no reply was checked, else passed or failed. */
export const checkOf = (numbers: NumberVerdict | null, attempts: number): NumberCheck =>
  numbers === null
    ? { status: 'not_run', attempts, unmatched: [] }
    : { status: numbers.passed ? 'passed' : 'failed', attempts, unmatched: [...numbers.unmatched] };

/** The trace of a reply written in code, such as the medical reply. facts are the numbers its text relies on. */
export function fixedReplyTrace(facts: readonly FactValue[] = []): Trace {
  return {
    ...traceOf(facts, { reason: null, reply: null, check: checkOf(null, 0) }),
    producedBy: 'fixed_reply',
  };
}
