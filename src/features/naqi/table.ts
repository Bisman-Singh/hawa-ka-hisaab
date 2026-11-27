// The NAQI breakpoint table, read from the CPCB facts, and the sub-index and band arithmetic on it.
// Values are read at the table's printed precision, rounding half up, so no value falls between two rows.
import { AIR_FACTS } from '../../config/facts/air.js';
import type { Fact } from '../../lib/types.js';
import type { AqiBand, ConcentrationUnit, PollutantId } from './types.js';

/** One printed row below Severe: a concentration range and the index range it maps to. */
export interface BreakpointRow {
  readonly low: number;
  readonly high: number;
  readonly indexLow: number;
  readonly indexHigh: number;
}

/**
 * How one pollutant is read: averaging hours, unit, printed decimals and the rows Good to Very poor. oneHourFrom is
 * the lowest concentration of the rows meant for one hour values, from it up to Severe, or null when every row is
 * for means over the averaging hours.
 */
export interface PollutantRule {
  readonly pollutant: PollutantId;
  readonly hours: 8 | 24;
  readonly unit: ConcentrationUnit;
  readonly decimals: number;
  readonly rows: readonly BreakpointRow[];
  readonly oneHourFrom: number | null;
}

/** The table: the band index ranges, the Severe floor and the rule for every pollutant. */
export interface NaqiTable {
  readonly bands: readonly { readonly band: AqiBand; readonly high: number }[];
  readonly severeFloor: number;
  readonly pollutants: Readonly<Record<PollutantId, PollutantRule>>;
}

const BAND_KEYS: readonly (readonly [AqiBand, string])[] = [
  ['good', 'good'],
  ['satisfactory', 'satisfactory'],
  ['moderate', 'moderate'],
  ['poor', 'poor'],
  ['very_poor', 'very-poor'],
];

type Reading = readonly [hours: 8 | 24, unit: ConcentrationUnit, decimals: number, periodRows: number];

// Averaging periods and units as the naqi-averaging fact states them. CO is printed to one decimal in mg. The O3
// cells from Very poor on carry the table's asterisk: one hourly values, for mathematical calculation only.
const READING: Readonly<Record<PollutantId, Reading>> = {
  pm25: [24, 'ug_m3', 0, 5],
  pm10: [24, 'ug_m3', 0, 5],
  no2: [24, 'ug_m3', 0, 5],
  so2: [24, 'ug_m3', 0, 5],
  o3: [8, 'ug_m3', 0, 4],
  co: [8, 'mg_m3', 1, 5],
  nh3: [24, 'ug_m3', 0, 5],
};

/** Rounds a value to the given number of decimals, half up. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * The value of a number fact by id, or the top of its range when it has one, as for a band or a breakpoint row.
 * It throws when the fact is missing or not a number, a fault in the data.
 */
export function numberFactValue(facts: readonly Fact[], id: string): number {
  const fact = facts.find((candidate) => candidate.id === id);
  if (fact?.kind !== 'number') {
    throw new Error(`Missing number fact ${id}`);
  }
  return fact.range?.high ?? fact.value;
}

interface BandEntry {
  readonly band: AqiBand;
  readonly key: string;
  readonly high: number;
}

function buildRule(
  facts: readonly Fact[],
  pollutant: PollutantId,
  bands: readonly BandEntry[],
): PollutantRule {
  const [hours, unit, decimals, periodRows] = READING[pollutant];
  let low = 0;
  let indexLow = 0;
  const rows = bands.map(({ key, high: indexHigh }) => {
    const high = numberFactValue(facts, `naqi-${pollutant}-${key}`);
    const row = { low, high, indexLow, indexHigh };
    low = roundTo(high + 10 ** -decimals, decimals);
    indexLow = row.indexHigh + 1;
    return row;
  });
  const oneHourFrom = rows.find((_row, index) => index >= periodRows)?.low ?? null;
  return { pollutant, hours, unit, decimals, rows, oneHourFrom };
}

/** Builds the table from facts. It throws when a fact it needs is missing, which is a fault in the data. */
export function buildNaqiTable(facts: readonly Fact[]): NaqiTable {
  const bands = BAND_KEYS.map(([band, key]): BandEntry => ({
    band,
    key,
    high: numberFactValue(facts, `naqi-band-${key}`),
  }));
  const rule = (pollutant: PollutantId): PollutantRule => buildRule(facts, pollutant, bands);
  return {
    bands,
    severeFloor: numberFactValue(facts, 'naqi-band-very-poor') + 1,
    pollutants: {
      pm25: rule('pm25'),
      pm10: rule('pm10'),
      no2: rule('no2'),
      so2: rule('so2'),
      o3: rule('o3'),
      co: rule('co'),
      nh3: rule('nh3'),
    },
  };
}

/** The table built from the air facts. */
export const NAQI_TABLE: NaqiTable = buildNaqiTable(AIR_FACTS);

/**
 * The sub-index for a concentration in the table's unit, by linear interpolation within its row. Above the top
 * printed row CPCB gives no upper concentration, so the sub-index is the Severe floor, 401, read as 401 or more.
 */
export function subIndex(pollutant: PollutantId, concentration: number): number {
  const rule = NAQI_TABLE.pollutants[pollutant];
  const value = roundTo(concentration, rule.decimals);
  const row = rule.rows.find((candidate) => value <= candidate.high);
  if (!row) {
    return NAQI_TABLE.severeFloor;
  }
  const slope = (row.indexHigh - row.indexLow) / (row.high - row.low);
  return Math.round(slope * (value - row.low) + row.indexLow);
}

/** The band of an index value by the CPCB ranges. Anything above Very poor is Severe. */
export function bandForIndex(value: number): AqiBand {
  return NAQI_TABLE.bands.find((entry) => value <= entry.high)?.band ?? 'severe';
}
