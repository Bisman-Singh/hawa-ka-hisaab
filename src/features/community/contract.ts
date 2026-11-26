// Contract for POST /api/notice: community facts, actions and the notice in English and Hindi.
import { z } from 'zod';
import { definePostRoute } from '../../lib/contract.js';
import { traceSchema } from '../../lib/schemas/trace.js';
import { locationSchema } from '../air/schemas.js';
import { figureSchema } from '../ledger/schemas.js';
import { communityActionSchema, communityInputSchema, noticeSchema } from './schemas.js';

/** Body of POST /api/notice. */
export const noticeRequestSchema = z.strictObject({
  community: communityInputSchema,
  location: locationSchema,
});

/** Body of the notice response. Facts are computed in code with sourced factors only. */
export const noticeResponseSchema = z.strictObject({
  facts: z.array(figureSchema).max(12),
  actions: z.array(communityActionSchema).max(12),
  notice: noticeSchema,
  trace: traceSchema,
});

/** POST /api/notice. Over the model limit it answers on the rules path. */
export const noticeRoute = definePostRoute({
  method: 'POST',
  path: '/api/notice',
  body: noticeRequestSchema,
  response: noticeResponseSchema,
});
