// The modelled index: trailing means of the model hours, a sub-index for each from the NAQI table, worst one wins.
// Used only on the modelled path and always labelled an estimate. Never used for a station.
import type { HourlyAir } from '../air/types.js';
import { bandForIndex, NAQI_TABLE, roundTo, subIndex } from './table.js';
import type { ModelledSubIndex, NaqiEstimate, PollutantId } from './types.js';

const HOUR_MS = 3_600_000;

type ModelPollutant = Extract<PollutantId, keyof HourlyAir>;

// The model gives no NH3 for India. Particulates come first, so they win a tie for the worst sub-index.
const MODEL_POLLUTANTS: readonly ModelPollutant[] = ['pm25', 'pm10', 'no2', 'so2', 'o3', 'co'];

// CPCB needs 16 of 24 hours for a sub-index; the same two thirds is asked of the 8 hour means.
const MIN_SHARE = 2 / 3;

function trailingMean(rows: readonly HourlyAir[], pollutant: ModelPollutant, hours: number): number | null {
  const values = rows.map((row) => row[pollutant]).filter((value) => value !== null);
  if (values.length < Math.ceil(hours * MIN_SHARE)) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function modelledSubIndex(
  rows: readonly HourlyAir[],
  pollutant: ModelPollutant,
  endMs: number,
): ModelledSubIndex[] {
  const rule = NAQI_TABLE.pollutants[pollutant];
  const startMs = endMs - (rule.hours - 1) * HOUR_MS;
  const window = rows.filter((row) => {
    const at = Date.parse(row.time);
    return at >= startMs && at <= endMs;
  });
  const mean = trailingMean(window, pollutant, rule.hours);
  if (mean === null) {
    return [];
  }
  const inUnit = rule.unit === 'mg_m3' ? mean / 1000 : mean;
  const meanConcentration = roundTo(inUnit, rule.decimals);
  return [
    {
      pollutant,
      subIndex: subIndex(pollutant, meanConcentration),
      meanConcentration,
      unit: rule.unit,
      averagingHours: rule.hours,
    },
  ];
}

/**
 * Estimates the index at modelHourMs from modelled hours in micrograms per cubic metre. Each mean covers the hours
 * up to and including modelHourMs. It needs three pollutants, one of them PM2.5 or PM10, as CPCB requires.
 */
export function estimateNaqi(rows: readonly HourlyAir[], modelHourMs: number): NaqiEstimate {
  const subIndices = MODEL_POLLUTANTS.flatMap((pollutant) => modelledSubIndex(rows, pollutant, modelHourMs));
  const available = subIndices.map((entry) => entry.pollutant);
  if (subIndices.length < 3) {
    return { status: 'insufficient', reason: 'too_few_pollutants', available };
  }
  if (!available.includes('pm25') && !available.includes('pm10')) {
    return { status: 'insufficient', reason: 'no_particulate', available };
  }
  const worst = subIndices.reduce((best, entry) => (entry.subIndex > best.subIndex ? entry : best));
  return {
    status: 'computed',
    value: worst.subIndex,
    band: bandForIndex(worst.subIndex),
    predominant: worst.pollutant,
    subIndices,
  };
}
