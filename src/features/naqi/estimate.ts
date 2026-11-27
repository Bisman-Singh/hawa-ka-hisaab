// The modelled index: trailing means of the model hours, a sub-index for each from the NAQI table, worst one wins.
// Used only on the modelled path and always labelled an estimate. Never used for a station.
import type { HourlyAir } from '../air/types.js';
import { bandForIndex, NAQI_TABLE, roundTo, subIndex, type PollutantRule } from './table.js';
import type { ModelledSubIndex, NaqiEstimate, PollutantId } from './types.js';

const HOUR_MS = 3_600_000;

type ModelPollutant = Extract<PollutantId, keyof HourlyAir>;

// The model gives no NH3 for India. Particulates come first, so they win a tie for the worst sub-index.
const MODEL_POLLUTANTS: readonly ModelPollutant[] = ['pm25', 'pm10', 'no2', 'so2', 'o3', 'co'];

// CPCB needs 16 of 24 hours for a sub-index; the same two thirds is asked of the 8 hour means.
const MIN_SHARE = 2 / 3;

// The values of the window, or none when fewer than two thirds of its hours have one.
function windowValues(rows: readonly HourlyAir[], pollutant: ModelPollutant, hours: number): number[] {
  const values = rows.map((row) => row[pollutant]).filter((value) => value !== null);
  return values.length < Math.ceil(hours * MIN_SHARE) ? [] : values;
}

// The mean in the table's unit, or, above the rows meant for means, the highest single hour: CPCB gives ozone 8
// hour rows only up to Poor and its higher rows for one hour values, so an 8 hour mean is never read against them.
function concentration(
  values: readonly number[],
  rule: PollutantRule,
): readonly [value: number, hours: 1 | 8 | 24] {
  const inUnit = (value: number) => roundTo(rule.unit === 'mg_m3' ? value / 1000 : value, rule.decimals);
  const mean = inUnit(values.reduce((sum, value) => sum + value, 0) / values.length);
  const oneHour = rule.oneHourFrom !== null && mean >= rule.oneHourFrom;
  return oneHour ? [inUnit(Math.max(...values)), 1] : [mean, rule.hours];
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
  const values = windowValues(window, pollutant, rule.hours);
  if (values.length === 0) {
    return [];
  }
  const [meanConcentration, averagingHours] = concentration(values, rule);
  return [
    {
      pollutant,
      subIndex: subIndex(pollutant, meanConcentration),
      meanConcentration,
      unit: rule.unit,
      averagingHours,
    },
  ];
}

/**
 * Estimates the index at modelHourMs from modelled hours in micrograms per cubic metre. Each mean covers the hours
 * up to and including modelHourMs. It needs three pollutants, one of them PM2.5 or PM10, as CPCB requires. An ozone
 * 8 hour mean above 208 gives way to the highest hour of those 8, marked with averagingHours 1.
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
