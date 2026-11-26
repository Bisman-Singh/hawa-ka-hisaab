// Builders for community tests: readings by band, a synthetic forecast day, a GRAP notice and full inputs.
// All values are synthetic test data, not facts.
import type { AirReading, GrapNotice, HourCurve } from '../../../src/features/air/types.js';
import type { ActionText, PerKind } from '../../../src/features/community/text-en.js';
import type {
  CommunityContext,
  CommunityInput,
  CommunityKind,
} from '../../../src/features/community/types.js';
import type { AqiBand } from '../../../src/features/naqi/types.js';
import { analyseTiming } from '../../../src/features/community/timing.js';
import { templateValues } from '../../../src/features/community/values.js';
import { TEST_FORECAST_SOURCE } from '../../support/fake-air.js';
import { sampleSource } from '../../support/samples.js';

export const BANDS: readonly AqiBand[] = ['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe'];

export const AQI_BY_BAND: Readonly<Record<AqiBand, number>> = {
  good: 41,
  satisfactory: 78,
  moderate: 157,
  poor: 246,
  very_poor: 347,
  severe: 433,
};

/** 26 Nov 2026 at 07:00 IST. */
export const NOW = Date.parse('2026-11-26T07:00:00+05:30');

/** A station reading at 06:00 IST with the given band, or a blank AQI when band is null. */
export function stationReading(
  band: AqiBand | null,
  name = 'Sector 62, Noida - IMD',
  stale = false,
): AirReading {
  return {
    path: 'station',
    station: { name, city: 'Noida', state: 'Uttar Pradesh', lat: 28.62, lon: 77.36 },
    distanceKm: 3.4,
    aqi: band === null ? null : { value: AQI_BY_BAND[band], band, predominant: 'pm25' },
    pollutants: [],
    readingHour: '2026-11-26T06:00:00+05:30',
    stale,
    source: sampleSource(),
  };
}

/** A modelled reading at 05:00 IST with the given band. */
export function modelledReading(band: AqiBand): AirReading {
  return {
    path: 'modelled',
    reason: 'no_station_in_range',
    estimate: {
      status: 'computed',
      value: AQI_BY_BAND[band],
      band,
      predominant: 'pm25',
      subIndices: [
        { pollutant: 'pm25', subIndex: 1, meanConcentration: 1, unit: 'ug_m3', averagingHours: 24 },
        { pollutant: 'pm10', subIndex: 1, meanConcentration: 1, unit: 'ug_m3', averagingHours: 24 },
        { pollutant: 'no2', subIndex: 1, meanConcentration: 1, unit: 'ug_m3', averagingHours: 24 },
      ],
    },
    modelHour: '2026-11-26T05:00:00+05:30',
    nearestStationKm: 84,
    source: sampleSource(),
  };
}

/** No station and no model answered. */
export const UNAVAILABLE: AirReading = { path: 'unavailable', reason: 'feed_and_model_down' };

/**
 * A forecast for 26 Nov in UTC times, as a fake would give them: dirty mornings and evenings, cleanest from 13:00 to
 * 16:00 IST. One day either side is included to prove other days are ignored.
 */
export function dayCurve(): HourCurve {
  const start = Date.parse('2026-11-25T00:00:00+05:30');
  const shape = (hour: number): number => (hour >= 13 && hour < 16 ? 40 : 80 + Math.abs(14 - hour) * 10);
  return {
    kind: 'model_forecast',
    issuedAt: '2026-11-26T06:00:00+05:30',
    hours: Array.from({ length: 72 }, (_, index) => ({
      time: new Date(start + index * 3_600_000).toISOString(),
      pm25: index < 24 || index >= 48 ? 5 : shape(index - 24),
      pm10: null,
      no2: null,
      so2: null,
      o3: null,
      co: null,
    })),
    source: TEST_FORECAST_SOURCE,
  };
}

/** A GRAP notice for Delhi NCR from an order of 17 Nov 2026. */
export function grapNotice(stage: GrapNotice['stage'] = 'II'): GrapNotice {
  return { region: 'delhi_ncr', stage, orderDate: '2026-11-17', factId: 'grap-order-2026-11-17' };
}

/** A school with every input filled, using numbers that appear nowhere in the facts. */
export function fullSchool(): CommunityInput {
  return {
    kind: 'school',
    homes: null,
    pupils: 413,
    generator: { hoursPerDay: 2.5, kva: 62, fuel: 'diesel' },
    wasteBurning: 'often',
    gateIdling: { vehiclesPerDay: 137, idleMinutes: 6 },
    assembly: '07:45',
    outdoorPeriods: [
      { start: '08:50', durationMinutes: 40 },
      { start: '13:10', durationMinutes: 35 },
    ],
    outdoorStaff: 11,
  };
}

/** A housing society with every input filled, using numbers that appear nowhere in the facts. */
export function fullSociety(): CommunityInput {
  return {
    kind: 'housing_society',
    homes: 214,
    pupils: null,
    generator: { hoursPerDay: 7, kva: 180, fuel: 'unknown' },
    wasteBurning: 'sometimes',
    gateIdling: { vehiclesPerDay: 389, idleMinutes: 1.5 },
    assembly: null,
    outdoorPeriods: [
      { start: '06:20', durationMinutes: 50 },
      { start: '17:40', durationMinutes: 75 },
    ],
    children: 61,
    olderAdults: 37,
    outdoorStaff: 9,
  };
}

/** A context for the full school on a severe day in Delhi NCR, with any field replaced. */
export function context(overrides: Partial<CommunityContext> = {}): CommunityContext {
  return {
    community: fullSchool(),
    reading: stationReading('severe'),
    forecast: dayCurve(),
    grap: grapNotice(),
    now: NOW,
    ...overrides,
  };
}

/** Every combination the sweeping tests run: both kinds, every reading kind, with and without GRAP. */
export function allContexts(): CommunityContext[] {
  const readings: AirReading[] = [
    ...BANDS.map((band) => stationReading(band)),
    ...BANDS.map((band) => modelledReading(band)),
    stationReading(null),
    stationReading('poor', 'Anand Vihar, Delhi - DPCC', true),
    UNAVAILABLE,
  ];
  return [fullSchool(), fullSociety()].flatMap((community) =>
    readings.flatMap((reading) =>
      [grapNotice(), grapNotice('none'), null].map((grap) => context({ community, reading, grap })),
    ),
  );
}

/** Every string inside a template table, however deeply nested. */
export function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  return typeof value === 'object' && value !== null ? Object.values(value).flatMap(stringsIn) : [];
}

/** The placeholder names a template string uses. */
export const placeholdersIn = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '');

/**
 * What is wrong with a set of template strings: digits of any script, an em dash, the wrong script for the
 * language, or a nukta on a borrowed sound such as za or fa, which these templates leave out throughout for one
 * consistent spelling. The native letters with a nukta, the flapped da and dha, keep it. Fact ids may hold digits.
 */
export function templateProblems(strings: readonly string[], lang: 'en' | 'hi'): string[] {
  const rules: readonly (readonly [string, (text: string) => boolean])[] = [
    [
      'digit',
      (text) => !text.startsWith('community-') && /[0-9\u0966-\u096F]/.test(text.replace(/\{\w+\}/g, '')),
    ],
    ['em dash', (text) => text.includes(String.fromCharCode(0x2014))],
    [
      'wrong script',
      (text) => (lang === 'en' ? /[\u0900-\u097F]/.test(text) : !/[\u0900-\u097F]/.test(text)),
    ],
    ['nukta', (text) => /[\u0915-\u0917\u091C\u092B]\u093C|[\u0958-\u095B\u095E]/.test(text)],
  ];
  return strings.flatMap((text) =>
    rules.filter(([, broken]) => broken(text)).map(([name]) => `${name}: ${text}`),
  );
}

/** Placeholder names that have a value for the full school on a severe day in Delhi NCR, where every one is set. */
export function knownPlaceholders(): Set<string> {
  const timing = analyseTiming(fullSchool(), dayCurve(), '2026-11-26');
  return new Set(Object.keys(templateValues(context(), { band: 'severe', timing, date: '2026-11-26' })));
}

/** Placeholders a set of template strings uses that have no value. */
export function unknownPlaceholders(strings: readonly string[]): string[] {
  const known = knownPlaceholders();
  return strings.flatMap(placeholdersIn).filter((name) => !known.has(name));
}

const KINDS: readonly CommunityKind[] = ['school', 'housing_society'];

/** Actions whose Hindi line uses other placeholders than the English line, or that exist in one language only. */
export function placeholderMismatches(
  english: Readonly<Record<string, ActionText>>,
  hindi: Readonly<Record<string, PerKind>>,
): string[] {
  const names = (text: string): string => [...new Set(placeholdersIn(text))].sort().join(',');
  return Object.entries(hindi).flatMap(([id, lines]) => {
    const line = Object.entries(english).find(([key]) => key === id)?.[1].line;
    return KINDS.filter((kind) => line === undefined || names(line[kind]) !== names(lines[kind])).map(
      (kind) => `${id} ${kind}`,
    );
  });
}
