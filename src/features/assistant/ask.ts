// Follow-up questions: the medical gate first, then the model answers by calling the calculators it is given.
// With the model unavailable the answer is a fixed line and the day's health advice, labelled as such.
import type { z } from 'zod';
import type { JsonValue } from '../../lib/json.js';
import type { ModelTool } from '../../lib/model.js';
import type { FactValue, Language, Trace } from '../../lib/types.js';
import type { AqiBand } from '../naqi/types.js';
import { bandAdvice } from './band-advice.js';
import { fixedReplyTrace } from './guard-trace.js';
import { runGuarded, type Guarded, type ModelRun } from './guarded.js';
import { ASK_INSTRUCTIONS } from './instructions.js';
import { fixedMedicalReply, medicalGate, mentionsMedicine, type FixedReply } from './medical-gate.js';
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
    check: (reply) => (mentionsMedicine(reply.text) ? 'medicine' : null),
  });
}

const UNAVAILABLE: Readonly<Record<Language, string>> = {
  en: "Questions are answered by the model, which is not available right now, so nothing was worked out for this one. The plan above comes from the app's own rules and gives the reason for each step.",
  hi: 'सवालों के जवाब मॉडल देता है, जो अभी उपलब्ध नहीं है, इसलिए इस सवाल पर कुछ नहीं निकाला गया। ऊपर की योजना ऐप के अपने नियमों से बनी है और हर कदम का कारण बताती है।',
};

/** The answer when the model path is unavailable: a fixed line, then the advice for the band when it is known. */
export function unavailableAnswer(
  language: Language,
  band: AqiBand | null,
): { text: string; factIds: string[] } {
  const advice = band === null ? null : bandAdvice(band, language);
  return {
    text: advice === null ? UNAVAILABLE[language] : `${UNAVAILABLE[language]} ${advice.text}`,
    factIds: [...(advice?.factIds ?? [])],
  };
}
