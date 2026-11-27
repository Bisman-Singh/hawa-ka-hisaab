// The words of the "how this was made" sheet and the working behind a figure, from words.json.
import type { Effect, WorkingInput } from '../../features/ledger/types.js';
import type { FallbackReason, GuardCheck, NumberCheck, ToolCallRecord, Trace } from '../../lib/types.js';
import WORDS from './words.json' with { type: 'json' };

/** Strings of the sheet and the working. */
export const TRACE = WORDS.trace;

/** Reasons the model was never asked, so the facts made for it were not sent. */
const NOT_ASKED: ReadonlySet<Trace['fallbackReason']> = new Set(['disabled', 'rate_limited', 'daily_cap']);

/** True when the facts of this trace went to the model, false when they were only made for it. */
export function factsWereSent(trace: Trace): boolean {
  return !NOT_ASKED.has(trace.fallbackReason);
}

/** Who wrote the words, in a sentence. */
export const MADE_BY: Readonly<Record<Trace['producedBy'], string>> = WORDS.madeBy;

/** Plain words for why the rules wrote the text instead of the model. */
export const FALLBACK: Readonly<Record<FallbackReason, string>> = WORDS.fallback;

/** What a refused reply did, finishing the sentence "its reply was not used because it". */
export const REFUSED: Readonly<Record<GuardCheck, string>> = WORDS.refused;

/** The number check result in a sentence. */
export const CHECK: Readonly<Record<NumberCheck['status'], string>> = WORDS.check;

/** Where a working input came from. */
export const INPUT_FROM: Readonly<Record<WorkingInput['from'], string>> = WORDS.inputFrom;

/** What each kind of effect is called in its working. */
export const EFFECT_NAMES: Readonly<Record<Effect['kind'], string>> = WORDS.effectNames;

/** Why a calculator call returned nothing. */
export const CALL_FAILURE: Readonly<Record<NonNullable<ToolCallRecord['failure']>, string>> =
  WORDS.callFailure;

/** A reply refused by a check, in a sentence. */
export function refusalText(check: GuardCheck): string {
  return `${TRACE.refusedWhy} ${REFUSED[check]}.`;
}

/** Why fixed rules wrote the words: the check that refused the model's reply when one did, else the reason. */
export function fallbackText(trace: Trace, reason: FallbackReason): string {
  return trace.refusedBy === undefined ? FALLBACK[reason] : refusalText(trace.refusedBy);
}
