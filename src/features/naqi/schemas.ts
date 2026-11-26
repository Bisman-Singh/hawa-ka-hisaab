// NAQI vocabulary: pollutant ids, AQI bands and the estimate computed in code on the modelled path.
import { z } from 'zod';

/** Pollutants the Indian index uses, by code id. The CPCB feed writes PM2.5 as pm25 and OZONE as o3 here. */
export const pollutantIdSchema = z.enum(['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3']);

/** The six NAQI bands, mildest first. */
export const aqiBandSchema = z.enum(['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe']);

/** Units of a modelled mean. CO is in mg per cubic metre, the rest in micrograms per cubic metre. */
export const concentrationUnitSchema = z.enum(['ug_m3', 'mg_m3']);

/** One pollutant's sub-index on the modelled path, with the trailing mean it came from. */
export const modelledSubIndexSchema = z.strictObject({
  pollutant: pollutantIdSchema,
  subIndex: z.int().min(0),
  meanConcentration: z.number().min(0),
  unit: concentrationUnitSchema,
  averagingHours: z.union([z.literal(8), z.literal(24)]),
});

/**
 * A NAQI value estimated in code from modelled concentrations, never a station reading.
 * insufficient follows the CPCB rule: three pollutants are needed and one must be PM2.5 or PM10.
 */
export const naqiEstimateSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('computed'),
    value: z.int().min(0),
    band: aqiBandSchema,
    predominant: pollutantIdSchema,
    subIndices: z.array(modelledSubIndexSchema).min(3).max(7),
  }),
  z.strictObject({
    status: z.literal('insufficient'),
    reason: z.enum(['too_few_pollutants', 'no_particulate']),
    available: z.array(pollutantIdSchema).max(7),
  }),
]);
