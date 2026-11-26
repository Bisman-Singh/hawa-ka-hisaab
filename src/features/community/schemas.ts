// A housing society or school: its own details, the facts computed from them, actions and a printable notice.
import { z } from 'zod';
import { allUnique, boundedText, clockTimeSchema } from '../../lib/schemas/common.js';
import { factIdSchema } from '../../lib/schemas/facts.js';

const headcount = (max: number) => z.int().min(0).max(max).nullable().optional();

/**
 * What a society or school enters about itself. No names are needed. gateIdling.idleMinutes is per vehicle.
 * children and olderAdults are a society's own counts; a school's pupils are its children. outdoorStaff counts
 * guards, sweepers, gardeners and gate staff. Facts and actions are computed in code from these inputs; the
 * model only words the notice.
 */
export const communityInputSchema = z
  .strictObject({
    kind: z.enum(['housing_society', 'school']),
    homes: z.int().min(1).max(10_000).nullable(),
    pupils: z.int().min(1).max(20_000).nullable(),
    generator: z
      .strictObject({
        hoursPerDay: z.number().min(0).max(24),
        kva: z.number().positive().max(5000).nullable(),
        fuel: z.enum(['diesel', 'gas', 'unknown']),
      })
      .nullable(),
    wasteBurning: z.enum(['never', 'sometimes', 'often']),
    gateIdling: z
      .strictObject({
        vehiclesPerDay: z.int().min(0).max(20_000),
        idleMinutes: z.number().min(0).max(120),
      })
      .nullable(),
    assembly: clockTimeSchema.nullable(),
    outdoorPeriods: z
      .array(z.strictObject({ start: clockTimeSchema, durationMinutes: z.int().min(5).max(240) }))
      .max(12),
    children: headcount(20_000),
    olderAdults: headcount(20_000),
    outdoorStaff: headcount(2000),
  })
  .refine((input) => (input.kind === 'school' ? input.pupils !== null : input.homes !== null), {
    error: 'a school needs a pupil count and a housing society needs a home count',
  })
  .refine(
    (input) => input.kind === 'housing_society' || (input.children ?? input.olderAdults ?? null) === null,
    {
      error: 'child and older adult counts are for a housing society; a school gives pupils',
    },
  );

/** Id of a community action, formed in code, such as no-idling. */
export const communityActionIdSchema = z
  .string()
  .max(48)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);

/** One action for the society or school, with the facts behind it. */
export const communityActionSchema = z.strictObject({
  id: communityActionIdSchema,
  title: boundedText(160),
  detail: boundedText(600),
  factIds: z.array(factIdSchema).min(1).max(12),
});

/** Notice text in one language: a title and short lines to print or copy. */
export const noticeTextSchema = z.strictObject({
  title: boundedText(160),
  lines: z.array(boundedText(400)).min(1).max(14),
});

/**
 * The worded part of a notice in one language: the title and one line per action, keyed by action id. The
 * opening line with the reading and the closing line are written by code and never reworded.
 */
export const noticeWordingSchema = z.strictObject({
  title: boundedText(160),
  actions: z
    .array(z.strictObject({ id: communityActionIdSchema, text: boundedText(400) }))
    .min(1)
    .max(12)
    .refine((actions) => allUnique(actions.map((action) => action.id)), {
      error: 'action ids must be unique',
    }),
});

/** What the model returns when it words a notice: both languages, each with every action by id. */
export const noticeReplySchema = z.strictObject({
  en: noticeWordingSchema,
  hi: noticeWordingSchema,
});

/**
 * The notice as served. The Hindi passage is shown with lang="hi". hi is null on the rules path when no Hindi
 * text written in code covers the notice; the trace says why.
 */
export const noticeSchema = z.strictObject({
  en: noticeTextSchema,
  hi: noticeTextSchema.nullable(),
});
