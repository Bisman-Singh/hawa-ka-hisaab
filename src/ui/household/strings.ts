// Words of the household intake and the household form. Option labels follow the household schema's values.
import { MAX_INTAKE_TEXT_CHARS } from '../../config/limits.js';
import type { FallbackReason } from '../../lib/types.js';

const MAX = String(MAX_INTAKE_TEXT_CHARS);

/**
 * The note shown before the first send. It states only what is certain about where the text goes; the terms of
 * the model provider's unpaid tier belong here once checked against the current terms.
 */
export const PRIVACY_NOTE = {
  lead: 'Before you send.',
  body: "What you type goes to Google's Gemini model, which reads it into the form on the next screen. Please leave out names and health record details.",
  kept: 'Nothing is kept on our server. Your household stays in this browser.',
};

/** Fixed text of the intake box on the first screen. */
export const INTAKE = {
  ask: 'Who is at home and how does your day go?',
  hint: 'Write it the way you would tell a neighbour: ages, health conditions, who goes where and when, how you cook, what burns at home.',
  count: (chars: number): string => `${String(chars)} of ${MAX} characters.`,
  empty: 'Write a few words about your household first.',
  tooLong: (chars: number): string => `This is ${String(chars)} characters. Keep it to ${MAX}.`,
  samples: 'Or start from a sample',
  use: 'Use this',
  used: 'Sample copied into the box.',
  read: 'Read my household',
  reading: 'Reading your household. This takes a few seconds.',
  byHand: 'Fill the form by hand',
};

/** Why the model did not read the text, in plain words. */
export const MODEL_DOWN: Readonly<Record<FallbackReason, string>> = {
  disabled: 'Reading by the model is switched off here.',
  quota: 'The model has used its free quota for now.',
  daily_cap: 'The app has used its model calls for today.',
  rate_limited: 'This browser sent several descriptions in a short time.',
  timeout: 'The model took too long to answer.',
  invalid_reply: 'The model gave an answer that could not be used.',
  upstream: 'The model did not answer.',
  number_check_failed: 'The model used a number that was not in your text, so its reading was not used.',
};

/** Fixed text of the household view. */
export const HOUSEHOLD = {
  title: 'Your household',
  readLede:
    'The model read your text into this form. Check each field; the plan uses the form, not your text.',
  handLede: 'Describe who is at home, the outings of the day and the home. It works without the model.',
  downTitle: 'The model is not reading descriptions right now',
  downNext: 'Fill in the form here. It works the same without the model.',
  wrote: 'What you wrote',
  unplaced: 'Not placed',
  unplacedNote: 'Parts of your text the model could not put in a field. Add them by hand if they matter.',
  assumed: 'Assumed',
  assumedNote: 'What the model filled in that your text did not say. Check these fields.',
  usesForm: 'The plan uses the form, not your text. You can fill or change every field by hand.',
  startFrom: 'Or start from a sample',
  useSample: 'Use this sample',
  sampleLoaded: 'Sample loaded into the form.',
  change: 'Change what you wrote',
  back: 'Back to the start',
};

/** Fixed text of the form. */
export const FORM = {
  people: 'People',
  peopleHint: 'No names needed. Describe each person by age and health.',
  person: (n: number): string => `Person ${String(n)}`,
  age: 'Age group',
  flags: 'Health and work',
  addPerson: 'Add a person',
  outings: 'Outings',
  outingsHint:
    'Trips and time outdoors. Mark a time that can move, so the plan can move it to cleaner hours.',
  outing: (n: number): string => `Outing ${String(n)}`,
  who: 'Who goes',
  what: 'What',
  label: 'In a few words',
  labelHint: 'Such as football practice. No names.',
  start: 'Starts at',
  minutes: 'Minutes, all in',
  setting: 'Where',
  timing: 'Time',
  travel: 'Travel by',
  km: 'Km, one way',
  fuel: 'Fuel',
  inIt: 'People in it',
  roundTrip: 'Same way back',
  addOuting: 'Add an outing',
  home: 'Home',
  cooking: 'Cooking fuel',
  sources: 'What burns or smokes at home',
  room: (n: number): string => `Room ${String(n)}`,
  roomKind: 'Room',
  area: 'Area, sq ft',
  areaHint: 'Length × width in feet. Leave empty if not known.',
  purifier: 'Air purifier in this room',
  cadr: 'Purifier CADR, m³/h',
  cadrHint: 'From the box or manual. Leave empty if not known.',
  addRoom: 'Add a room',
  remove: 'Remove',
  removed: (what: string): string => `${what} removed.`,
  undo: 'Undo',
  undone: 'Undone.',
  save: 'Save household',
  fix: (n: number): string =>
    `${String(n)} ${n === 1 ? 'field needs' : 'fields need'} a fix. The first is in focus.`,
  saved: 'Saved in this browser',
  savedSay: 'Household saved.',
  notKept: 'This browser is not keeping your household',
  notKeptBody: 'It stays until this page is closed.',
  plan: "Make today's plan",
};
