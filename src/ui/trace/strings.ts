// Words of the "how this was made" sheet and the working behind a figure.
import type { FallbackReason, GuardCheck, NumberCheck, ToolCallRecord, Trace } from '../../lib/types.js';
import type { WorkingInput } from '../../features/ledger/types.js';

/** Strings of the sheet and the working. */
export const TRACE = {
  open: 'How this was made',
  who: 'Who wrote it',
  check: 'Number check',
  checkNote:
    'Every numeral in model text must match a fact sent or a calculator result. A miss rejects the reply; the model may get one retry, then the fixed wording is used.',
  facts: 'Facts sent to the model',
  factsNotSent: 'Facts made for the model, not sent because it was not asked',
  factsCaption: 'Facts sent, with value, unit and id',
  factsHead: { label: 'Fact', value: 'Value', id: 'Id' },
  noFacts: 'No facts were sent, because the model was not asked.',
  reply: "The model's reply",
  refused: 'A reply the checks refused',
  refusedWhy: 'The model did reply, but its reply was not used because it',
  refusedNote: 'A refused reply is never kept or shown, so it cannot pass for advice.',
  replyNote:
    'The reply is checked against a schema. Text from it is shown as plain text, never as page code.',
  noReply: 'There is no model reply for this answer.',
  calls: 'Calculator calls',
  noCalls: 'None.',
  unmatched: 'Numbers that matched nothing:',
  inputs: 'Inputs',
  formula: 'Formula',
  sources: 'Factors and sources',
  noSource: 'no source record on this page',
  cached:
    'Reused from a few minutes ago. The same request was answered in the last five minutes, so the model was not asked again.',
};

/** Who wrote the words, in a sentence. */
export const MADE_BY: Readonly<Record<Trace['producedBy'], string>> = {
  model: 'The model chose and worded the steps from candidates that code had already worked out.',
  rules: 'Fixed rules wrote the words from the same candidates that code worked out.',
  fixed_reply: 'A reply written in advance. The question was not sent to the model.',
};

/** Plain words for why the rules wrote the text instead of the model. */
export const FALLBACK: Readonly<Record<FallbackReason, string>> = {
  disabled: 'No model key is set on this server.',
  quota: 'The model has used up its free quota for now.',
  timeout: 'The model took too long to answer.',
  invalid_reply: 'The model replied in a shape the app does not accept.',
  upstream: 'The model service failed to answer.',
  rate_limited: 'This browser asked the model too often in the last minute. Try again in a minute.',
  daily_cap: 'The app has reached its daily limit of model calls.',
  number_check_failed: 'The model used a number that is not in the facts, so its wording was not used.',
};

/** What a refused reply did, finishing the sentence "its reply was not used because it". */
export const REFUSED: Readonly<Record<GuardCheck, string>> = {
  schema: 'was not in the shape the app accepts',
  markup: 'contained markup',
  hidden: 'contained hidden characters',
  script: 'used letters from a script other than English or Hindi',
  link: 'contained a link, an email address or a phone number',
  numbers: 'used numbers the app did not supply',
  quotes: 'quoted words that are not the official text',
  medicine: 'gave advice on medicines',
  treatment: 'gave advice on treating symptoms or illness',
  unplaced: 'listed phrases that are not in what was typed',
  name: 'repeated a name from what was typed',
  label: 'put a number in the name of an activity',
  measure: 'gave a distance, room size, purifier rating or rider count that was not typed',
  ids: 'named steps the app did not offer',
  one_place: 'chose two steps for the same activity',
  actions_changed: 'changed the list of actions',
  wrong_script: 'mixed English and Hindi text',
  numbers_dropped: 'left out a number or time the notice needs',
  too_long: 'was longer than one printed page',
};

/** A reply refused by a check, in a sentence. */
export function refusalText(check: GuardCheck): string {
  return `${TRACE.refusedWhy} ${REFUSED[check]}.`;
}

/** Why fixed rules wrote the words: the check that refused the model's reply when one did, else the reason. */
export function fallbackText(trace: Trace, reason: FallbackReason): string {
  return trace.refusedBy === undefined ? FALLBACK[reason] : refusalText(trace.refusedBy);
}

/** The number check result in a sentence. */
export const CHECK: Readonly<Record<NumberCheck['status'], string>> = {
  passed: 'Passed. Every number in the reply matched a fact or a calculator result.',
  failed: 'Failed, so the reply was not used.',
  not_run: 'Not run, because no model text is shown.',
};

/** Where a working input came from. */
export const INPUT_FROM: Readonly<Record<WorkingInput['from'], string>> = {
  household: 'from your form',
  community: 'from your form',
  fact: 'a published factor',
  air: 'from the air reading',
  forecast: 'from the model forecast',
};

/** Why a calculator call returned nothing. */
export const CALL_FAILURE: Readonly<Record<NonNullable<ToolCallRecord['failure']>, string>> = {
  unknown_tool: 'Not a calculator the app has.',
  invalid_arguments: 'The arguments were refused.',
  failed: 'The calculator could not work it out.',
};
