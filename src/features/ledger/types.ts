// Types for the ledger feature, inferred from its schemas.
import type { z } from 'zod';
import type { effectSchema, figureSchema, workingInputSchema, workingSchema } from './schemas.js';

/** One input to a calculation. */
export type WorkingInput = z.infer<typeof workingInputSchema>;

/** The working behind a number. */
export type Working = z.infer<typeof workingSchema>;

/** The size of one choice's effect. */
export type Effect = z.infer<typeof effectSchema>;

/** A computed figure with its working. */
export type Figure = z.infer<typeof figureSchema>;
