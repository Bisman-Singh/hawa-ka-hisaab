// The day plan: candidate actions computed in code, the items chosen from them, indoor steps and alternatives.
import { z } from 'zod';
import { boundedText, clockTimeSchema, isoDateSchema, languageSchema } from '../../lib/schemas/common.js';
import { factIdSchema } from '../../lib/schemas/facts.js';
import { householdPatchSchema } from '../household/patch.js';
import { localIdSchema } from '../household/schemas.js';
import { effectSchema, figureSchema } from '../ledger/schemas.js';
import { aqiBandSchema } from '../naqi/schemas.js';
import { dayKindForBand, RESTRICTING_KINDS } from './day-kind.js';

/** Id of a candidate, step or alternative, formed in code as kind plus target, such as reschedule-a2. */
export const itemIdSchema = z
  .string()
  .max(48)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);
const memberIds = z.array(localIdSchema).max(12);
const factIds = z.array(factIdSchema).max(12);

/** The three parts of the day. */
export const slotSchema = z.enum(['morning', 'afternoon', 'evening']);

/** What an action does. reassure is for mild days, where most things are fine as they are. */
export const actionKindSchema = z.enum([
  'protect',
  'reschedule',
  'move_indoors',
  'swap_mode',
  'indoor_air',
  'reassure',
]);

/** A toggle on a plan item. It exists only when a cited factor backs it. */
export const whatIfSchema = z.strictObject({
  id: itemIdSchema,
  label: boundedText(80),
  patch: householdPatchSchema,
  factIds: factIds.min(1),
});

/** English template text written in code. It is used as is on the rules path. */
export const actionTextSchema = z.strictObject({
  title: boundedText(120),
  why: boundedText(400),
  tradeOff: boundedText(300).nullable(),
});

/** An action computed by code before the model sees anything. The model may only choose, order and word these. */
export const candidateActionSchema = z.strictObject({
  id: itemIdSchema,
  kind: actionKindSchema,
  slot: slotSchema,
  activityId: localIdSchema.nullable(),
  memberIds,
  start: clockTimeSchema.nullable(),
  effects: z.array(effectSchema).max(4),
  factIds,
  template: actionTextSchema,
  whatIfs: z.array(whatIfSchema).max(4),
});

/** A plan item as shown: a candidate with its final wording. Fixed activities keep their time. */
export const planItemSchema = candidateActionSchema.omit({ id: true, template: true }).extend({
  candidateId: itemIdSchema,
  title: boundedText(160),
  why: boundedText(600),
  tradeOff: boundedText(400).nullable(),
});

/** One indoor air step. Every step names its source; sizing and windows carry a computed figure. */
export const indoorStepSchema = z.strictObject({
  id: itemIdSchema,
  topic: z.enum(['purifier', 'ventilation', 'source_control', 'wet_mopping', 'mask', 'myth']),
  title: boundedText(160),
  detail: boundedText(600),
  roomId: localIdSchema.nullable(),
  window: z.strictObject({ start: clockTimeSchema, end: clockTimeSchema }).nullable(),
  figure: figureSchema.nullable(),
  factIds: factIds.min(1),
});

/** An "instead of X, do Y" pair. effect is null when no cited factor exists, and the reason stands alone. */
export const alternativeSchema = z.strictObject({
  id: itemIdSchema,
  activityId: localIdSchema.nullable(),
  instead: boundedText(120),
  doThis: boundedText(160),
  reason: boundedText(400),
  effect: effectSchema.nullable(),
  factIds,
});

const slotsSchema = z.strictObject({
  morning: z.array(planItemSchema).max(12),
  afternoon: z.array(planItemSchema).max(12),
  evening: z.array(planItemSchema).max(12),
});

/**
 * The whole plan for one day. dayKind must match the band, and is unknown when the band is. A mild day carries
 * no restricting items. language is the language of the worded fields; labels, formulas and units written in
 * code are English, and on the rules path the whole plan is English.
 */
export const planSchema = z
  .strictObject({
    date: isoDateSchema,
    dayKind: z.enum(['mild', 'moderate', 'severe', 'unknown']),
    band: aqiBandSchema.nullable(),
    headline: boundedText(200),
    slots: slotsSchema,
    indoor: z.array(indoorStepSchema).max(12),
    alternatives: z.array(alternativeSchema).max(12),
    language: languageSchema,
  })
  .refine((plan) => plan.dayKind === dayKindForBand(plan.band), { error: 'dayKind must follow the band' })
  .refine(
    (plan) =>
      plan.dayKind !== 'mild' ||
      [...plan.slots.morning, ...plan.slots.afternoon, ...plan.slots.evening].every(
        (item) => !RESTRICTING_KINDS.has(item.kind),
      ),
    { error: 'a mild day carries no restrictions' },
  );
