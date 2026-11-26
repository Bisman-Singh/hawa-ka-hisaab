// Types for the community feature, inferred from its schemas.
import type { z } from 'zod';
import type { noticeRequestSchema, noticeResponseSchema } from './contract.js';
import type { communityActionSchema, communityInputSchema } from './schemas.js';
import type { noticeSchema, noticeTextSchema } from './schemas.js';

/** What a society or school enters. */
export type CommunityInput = z.infer<typeof communityInputSchema>;

/** One community action. */
export type CommunityAction = z.infer<typeof communityActionSchema>;

/** Notice text in one language. */
export type NoticeText = z.infer<typeof noticeTextSchema>;

/** The notice in both languages. */
export type Notice = z.infer<typeof noticeSchema>;

/** Body of POST /api/notice. */
export type NoticeRequest = z.infer<typeof noticeRequestSchema>;

/** Body of the notice response. */
export type NoticeResponse = z.infer<typeof noticeResponseSchema>;
