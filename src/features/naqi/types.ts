// Types for the NAQI feature, inferred from its schemas.
import type { z } from 'zod';
import type { aqiBandSchema, concentrationUnitSchema, modelledSubIndexSchema } from './schemas.js';
import type { naqiEstimateSchema, pollutantIdSchema } from './schemas.js';

/** A pollutant code id. */
export type PollutantId = z.infer<typeof pollutantIdSchema>;

/** A NAQI band name. */
export type AqiBand = z.infer<typeof aqiBandSchema>;

/** Unit of a modelled mean. */
export type ConcentrationUnit = z.infer<typeof concentrationUnitSchema>;

/** One modelled sub-index with its mean. */
export type ModelledSubIndex = z.infer<typeof modelledSubIndexSchema>;

/** A computed or insufficient NAQI estimate on the modelled path. */
export type NaqiEstimate = z.infer<typeof naqiEstimateSchema>;
