// Follow-up questions: the medical gate first, then the model answers by calling the calculators it is given.
// With the model unavailable the answer is a fixed line and the day's health advice, labelled as such.
import type { z } from 'zod';
import type { JsonValue } from '../../lib/json.js';
import type { ModelTool } from '../../lib/model.js';
import type { FactValue, GuardCheck, Language, Trace } from '../../lib/types.js';
import type { AqiBand } from '../naqi/types.js';
import { bandAdvice } from './band-advice.js';
import { fixedReplyTrace } from './guard-trace.js';
import { runGuarded, type Guarded, type ModelRun } from './guarded.js';
import { ASK_INSTRUCTIONS } from './instructions.js';
import {
  fixedMedicalReply,
  medicalGate,
  mentionsMedicine,
  mentionsTreatment,
  type FixedReply,
} from './medical-gate.js';
import { misquotes } from './quotes.js';
import REPLIES from './replies.json' with { type: 'json' };
import { askReplySchema } from './schemas.js';

/** What the model returns for a question. */
export type AskReply = z.infer<typeof askReplySchema>;

/**
 * A question with its context. context is the household and air summary the caller assembles; sources are the
 * strings in it whose times the answer may repeat, and facts hold every number it may repeat. The question's own
 * numbers are never allowed. tools are the calculators bound by the caller; they take ids, not free numbers.
 */
export interface AskInput {
  readonly question: string;
  readonly language: Language;
  readonly band: AqiBand | null;
  readonly context: JsonValue;
  readonly sources: readonly JsonValue[];
  readonly facts: readonly FactValue[];
  readonly tools: readonly ModelTool[];
  readonly names?: readonly string[];
}

/** Names a medicine or a dose, gives treatment advice of any kind, or quotes words that are not official text. */
function answerProblem(text: string): GuardCheck | null {
  if (mentionsMedicine(text)) {
    return 'medicine';
  }
  if (mentionsTreatment(text)) {
    return 'treatment';
  }
  return misquotes([text]) ? 'quotes' : null;
}

/** The fixed medical reply, or the guarded model answer. */
export type AskOutcome =
  { readonly kind: 'medical_reply'; readonly reply: FixedReply; readonly trace: Trace } | Guarded<AskReply>;

/**
 * Answers a question. Medical questions get the fixed reply before any limit is taken or any model is asked, and
 * model answers that name a medicine are rejected.
 */
export function answerQuestion(run: ModelRun<AskReply>, input: AskInput): Promise<AskOutcome> {
  const verdict = medicalGate(input.question);
  if (verdict !== null) {
    const reply = fixedMedicalReply(verdict, input.language, input.band);
    return Promise.resolve({ kind: 'medical_reply', reply, trace: fixedReplyTrace(reply.facts) });
  }
  const data = { language: input.language, question: input.question, context: input.context };
  return runGuarded(run, {
    request: {
      task: 'ask',
      instructions: ASK_INSTRUCTIONS,
      data: JSON.stringify(data),
      facts: input.facts,
      schema: askReplySchema,
      tools: input.tools,
    },
    sources: () => input.sources,
    prose: (reply) => [reply.text],
    check: (reply) => answerProblem(reply.text),
    names: input.names ?? [],
  });
}

/** Why no model answer is shown: the model could not be asked, or its answer did not pass the checks. */
export type Unanswered = 'unavailable' | 'refused';

const UNANSWERED: Readonly<Record<Unanswered, Readonly<Record<Language, string>>>> = REPLIES.unanswered;

/** Whether a fallback trace means the model could not be asked or its answer was refused by a check. */
export function unansweredBy(trace: Trace): Unanswered {
  return trace.refusedBy === undefined ? 'unavailable' : 'refused';
}

/** The answer when no model answer is shown: a fixed line saying why, then the advice for the band when known. */
export function unavailableAnswer(
  language: Language,
  band: AqiBand | null,
  why: Unanswered = 'unavailable',
): { text: string; factIds: string[] } {
  const advice = band === null ? null : bandAdvice(band, language);
  const line = UNANSWERED[why][language];
  return {
    text: advice === null ? line : `${line} ${advice.text}`,
    factIds: [...(advice?.factIds ?? [])],
  };
}
