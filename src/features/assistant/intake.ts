// Intake: the person's own description turned into a household to check and edit. Code checks that unplaced
// phrases are copied exactly, that labels carry no names or numbers, and that no measure is guessed.
import type { z } from 'zod';
import { intakeReplySchema } from '../household/contract.js';
import { withTripDefaults } from '../household/trip-defaults.js';
import type { Household } from '../household/types.js';
import { runGuarded, type Guarded, type ModelRun } from './guarded.js';
import { INTAKE_INSTRUCTIONS, type GuardProblem } from './instructions.js';
import { findNumerals } from './numerals.js';
import { nameLikeWords, repeatsName } from './text-guard.js';

/** What the model returns for intake. */
export type IntakeReply = z.infer<typeof intakeReplySchema>;

type Form = (stated: number) => number;

const AS_WRITTEN: readonly Form[] = [(n) => n];
const ONE_WAY_KM: readonly Form[] = [(n) => n, (n) => n / 2, (n) => n / 1000];
const RIDERS: readonly Form[] = [(n) => n, (n) => n + 1];

function given(stated: readonly number[], value: number | null, forms: readonly Form[]): boolean {
  return value === null || stated.some((n) => forms.some((form) => Math.abs(form(n) - value) < 1e-9));
}

/**
 * True when a distance, room area, CADR or an occupancy above two is not a number the person wrote, as written or
 * in the one conversion the instructions allow. One or two riders are allowed for words such as alone or with a friend.
 */
export function guessedMeasure(household: Household, stated: readonly number[]): boolean {
  const trips = household.activities.flatMap((activity) => (activity.travel ? [activity.travel] : []));
  const tripsGiven = trips.every(
    (trip) =>
      given(stated, trip.distanceKm, ONE_WAY_KM) &&
      ((trip.occupancy ?? 0) <= 2 || given(stated, trip.occupancy, RIDERS)),
  );
  const roomsGiven = household.home.rooms.every(
    (room) =>
      given(stated, room.areaSqFt, AS_WRITTEN) &&
      given(stated, room.purifier?.cadrM3PerHour ?? null, AS_WRITTEN),
  );
  return !(tripsGiven && roomsGiven);
}

const labelsOf = (reply: IntakeReply): string[] =>
  reply.household.activities.flatMap((activity) => (activity.label === null ? [] : [activity.label]));

function intakeProblem(reply: IntakeReply, text: string): GuardProblem | null {
  if (!reply.unplaced.every((phrase) => text.includes(phrase))) {
    return 'unplaced';
  }
  if (repeatsName([...labelsOf(reply), ...reply.assumed], nameLikeWords(text))) {
    return 'name';
  }
  if (labelsOf(reply).some((label) => findNumerals(label).length > 0)) {
    return 'label';
  }
  const stated = findNumerals(text).flatMap((numeral) => (numeral.kind === 'number' ? [numeral.value] : []));
  return guessedMeasure(reply.household, stated) ? 'measure' : null;
}

const MAX_NOTES = 10;

/** A checked reply with the disclosed trip defaults filled in and noted among what was assumed. */
export function withDefaults(reply: IntakeReply): IntakeReply {
  const filled = withTripDefaults(reply.household, MAX_NOTES - reply.assumed.length);
  return { ...reply, household: filled.household, assumed: [...reply.assumed, ...filled.notes] };
}

/**
 * Turns the person's text into a household. Labels and notes may only repeat numbers from the text or from the
 * household returned, which the person sees and can edit. A driven trip with no rider count gets the disclosed
 * default after the checks, written in code.
 */
export async function runIntake(run: ModelRun<IntakeReply>, text: string): Promise<Guarded<IntakeReply>> {
  const guarded = await runGuarded(run, {
    request: {
      task: 'intake',
      instructions: INTAKE_INSTRUCTIONS,
      data: text,
      facts: [],
      schema: intakeReplySchema,
      tools: [],
    },
    sources: (reply) => [text, reply.household],
    prose: (reply) => [...labelsOf(reply), ...reply.assumed],
    check: (reply) => intakeProblem(reply, text),
  });
  return guarded.kind === 'checked' ? { ...guarded, value: withDefaults(guarded.value) } : guarded;
}
