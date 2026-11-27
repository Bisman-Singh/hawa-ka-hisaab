// The trace behind every model task and fixed reply: who produced it, the facts sent, the raw reply when it was
// used, the tool calls, the number check and the check that refused a reply, cut to the trace schema's limits.
import type { ModelReply } from '../../lib/model.js';
import type { FactValue, FallbackReason, GuardCheck, NumberCheck, Trace } from '../../lib/types.js';
import type { NumberVerdict } from './number-guard.js';

/** What the model wrote, as far as the trace shows it. modelId is null when no model answered. */
export type Written = Pick<ModelReply<unknown>, 'rawText' | 'toolCalls'> & {
  readonly modelId: string | null;
};

/** A reply a check refused: which check, and what was written, of which only the model and tool calls are kept. */
export interface Refused {
  readonly problem: GuardCheck;
  readonly reply: Written | null;
}

/**
 * The parts a trace is built from besides the facts. reason is null when the model's reply was used. reply is the
 * reply that was used; refused is the last reply a check refused, whose text never reaches the trace.
 */
export interface TraceParts {
  readonly reason: FallbackReason | null;
  readonly reply: Written | null;
  readonly check: NumberCheck;
  readonly refused?: Refused | null;
}

/** What the trace shows of the model's writing: the used reply's text, or only who wrote a refused one. */
function writing(parts: TraceParts): Pick<Trace, 'modelId' | 'modelReply' | 'toolCalls'> {
  const written = parts.reply ?? parts.refused?.reply ?? null;
  return {
    modelId: written?.modelId ?? null,
    modelReply: parts.reply ? parts.reply.rawText.slice(0, 80_000) : null,
    toolCalls: written ? written.toolCalls.slice(0, 20) : [],
  };
}

const refusal = (refused: Refused | null | undefined): Pick<Trace, 'refusedBy'> =>
  refused ? { refusedBy: refused.problem } : {};

/** A trace from its parts, every list and text cut to the trace schema's limits. */
export function traceOf(facts: readonly FactValue[], parts: TraceParts): Trace {
  return {
    producedBy: parts.reason === null ? 'model' : 'rules',
    fallbackReason: parts.reason,
    factsSent: facts.slice(0, 500),
    numberCheck: parts.check,
    cached: false,
    ...writing(parts),
    ...refusal(parts.refused),
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
