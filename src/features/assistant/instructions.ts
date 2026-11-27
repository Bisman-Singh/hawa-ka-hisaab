// The fixed instructions for each model task and the note for its one retry, from instructions.json. User text
// never goes in here; it goes in DATA. Rules shared by tasks are written once and named in the task lines.
import { fill } from '../../lib/template.js';
import type { GuardCheck } from '../../lib/types.js';
import TEXT from './instructions.json' with { type: 'json' };

const lines = (parts: readonly string[]): string => fill(parts.join('\n'), TEXT.rules);

/** Intake: a plain description of a household and its day, turned into one household object. */
export const INTAKE_INSTRUCTIONS = lines(TEXT.intake);

/** Plan wording: choose, order and word candidate actions computed in code, for this household in its own terms. */
export const PLAN_INSTRUCTIONS = lines(TEXT.plan);

/** Follow-up questions, answered from the plan and the calculator tools. */
export const ASK_INSTRUCTIONS = lines(TEXT.ask);

/** Rewording a community notice. They hold no user text and no numbers. */
export const NOTICE_INSTRUCTIONS = TEXT.notice.join(' ');

/** Why a reply was rejected, told to the model on its one retry. Fixed text, never the reply itself. */
export const RETRY_NOTES: Readonly<Record<GuardCheck, string>> = TEXT.retry;

/** The instructions for the one retry: the same task, told which check the last reply failed. */
export function retryInstructions(instructions: string, problem: GuardCheck): string {
  return `${instructions}\n${fill(TEXT.retryNote, { note: RETRY_NOTES[problem] })}`;
}
