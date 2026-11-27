// Types for the community feature, inferred from its schemas, and the shapes its pure functions pass around.
import type { z } from 'zod';
import type { FactValue, Language } from '../../lib/types.js';
import type { AirReading, GrapNotice, HourCurve } from '../air/types.js';
import type { Figure } from '../ledger/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { DayKind } from '../planner/day-kind.js';
import type { noticeRequestSchema, noticeResponseSchema } from './contract.js';
import type { Timing } from './timing.js';
import type {
  communityActionSchema,
  communityInputSchema,
  noticeReplySchema,
  noticeSchema,
  noticeTextSchema,
  noticeWordingSchema,
} from './schemas.js';

/** What a society or school enters. */
export type CommunityInput = z.infer<typeof communityInputSchema>;

/** A housing society or a school. */
export type CommunityKind = CommunityInput['kind'];

/** One community action. */
export type CommunityAction = z.infer<typeof communityActionSchema>;

/** Notice text in one language. */
export type NoticeText = z.infer<typeof noticeTextSchema>;

/** The notice in both languages. */
export type Notice = z.infer<typeof noticeSchema>;

/** The worded part of a notice in one language: title and one line per action id. */
export type NoticeWording = z.infer<typeof noticeWordingSchema>;

/** The worded part of a notice in both languages, as the model returns it and as the rules path writes it. */
export type NoticeReply = z.infer<typeof noticeReplySchema>;

/** Body of POST /api/notice. */
export type NoticeRequest = z.infer<typeof noticeRequestSchema>;

/** Body of the notice response. */
export type NoticeResponse = z.infer<typeof noticeResponseSchema>;

/**
 * Everything a community report is built from. now is epoch milliseconds; the notice is for that day in IST.
 * grap is the air feature's GRAP notice, present only for places in Delhi NCR.
 */
export interface CommunityContext {
  readonly community: CommunityInput;
  readonly reading: AirReading;
  readonly forecast: HourCurve | null;
  readonly grap: GrapNotice | null;
  readonly now: number;
}

/** The lines code writes around the worded part: the opening with the reading and the closing disclaimer. */
export interface NoticeFrame {
  readonly opening: string;
  readonly closing: string;
}

/**
 * The computed facts, ranked actions and rules notice for one society or school on one day. wording is the
 * rules text in the shape a model reply takes; factSet holds every number any of this text shows.
 */
export interface CommunityReport {
  readonly kind: CommunityKind;
  readonly date: string;
  readonly band: AqiBand | null;
  readonly dayKind: DayKind;
  readonly facts: readonly Figure[];
  readonly actions: readonly CommunityAction[];
  readonly wording: NoticeReply;
  readonly frame: Readonly<Record<Language, NoticeFrame>>;
  readonly notice: Notice;
  readonly factSet: readonly FactValue[];
}

/** What the report has worked out about the day before any text is filled. date is the IST notice date. */
export interface DayBasis {
  readonly band: AqiBand | null;
  readonly timing: Timing;
  readonly date: string;
}
