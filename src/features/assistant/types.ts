// Types for the assistant feature, inferred from its schemas.
import type { z } from 'zod';
import type { askRequestSchema, askResponseSchema } from './contract.js';

/** Body of POST /api/ask. */
export type AskRequest = z.infer<typeof askRequestSchema>;

/** Body of the ask response. */
export type AskResponse = z.infer<typeof askResponseSchema>;
