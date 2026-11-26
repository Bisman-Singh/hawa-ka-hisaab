// NAQI facts: band ranges and CPCB health statements, the breakpoint table and the rules for the index.
// Ids are naqi-band-<band>, naqi-health-<band> and naqi-<pollutant>-<band>; the NAQI code reads its table from them.
import type { Fact } from '../../../lib/types.js';
import { ABOUT_AQI, NAQI_REPORT } from './sources.js';

// Table 3.12, verbatim.
const HEALTH = {
  good: 'Minimal Impact',
  satisfactory: 'May cause minor breathing discomfort to sensitive people',
  moderate:
    'May cause breathing discomfort to the people with lung disease such as asthma and discomfort to people with heart disease, children and older adults',
  poor: 'May cause breathing discomfort to people on prolonged exposure and discomfort to people with heart disease with short exposure',
  'very-poor':
    'May cause respiratory illness to the people on prolonged exposure. Effect may be more pronounced in people with lung and heart diseases',
  severe:
    'May cause respiratory effects even on healthy people and serious health impacts on people with lung/heart diseases. The health impacts may be experienced even during light physical activity',
} satisfies Readonly<Record<string, string>>;

type Band = readonly [id: keyof typeof HEALTH, name: string, low: number, high: number];

const BANDS: readonly Band[] = [
  ['good', 'Good', 0, 50],
  ['satisfactory', 'Satisfactory', 51, 100],
  ['moderate', 'Moderate', 101, 200],
  ['poor', 'Poor', 201, 300],
  ['very-poor', 'Very Poor', 301, 400],
  ['severe', 'Severe', 401, 500],
];

type Pollutant = readonly [id: string, label: string, unit: string, hours: number, cells: string];

const UG = 'µg/m³';

// Table 3.11 cells as printed, Good to Very poor. Severe has no upper concentration: it is above the last cell.
const BREAKPOINTS: readonly Pollutant[] = [
  ['pm10', 'PM10', UG, 24, '0-50 51-100 101-250 251-350 351-430'],
  ['pm25', 'PM2.5', UG, 24, '0-30 31-60 61-90 91-120 121-250'],
  ['no2', 'NO2', UG, 24, '0-40 41-80 81-180 181-280 281-400'],
  ['o3', 'O3', UG, 8, '0-50 51-100 101-168 169-208 209-748'],
  ['co', 'CO', 'mg/m³', 8, '0-1.0 1.1-2.0 2.1-10 10.1-17 17.1-34'],
  ['so2', 'SO2', UG, 24, '0-40 41-80 81-380 381-800 801-1600'],
  ['nh3', 'NH3', UG, 24, '0-200 201-400 401-800 801-1200 1201-1800'],
];

const RULES: readonly (readonly [id: string, title: string, text: string])[] = [
  [
    'naqi-averaging',
    'Averaging periods for the index',
    '24-hourly average values for PM10, PM2.5, NO2, SO2, NH3, and Pb, and 8-hourly values for CO and O3.',
  ],
  [
    'naqi-worked-example',
    'CPCB worked example of a sub-index',
    'the sub-index for PM2.5 will be 51 at concentration 31 µg/m3, 100 at concentration 60 µg/m3, and 75 at concentration of 45 µg/m3',
  ],
  ['naqi-worst-sub-index', 'How the index is chosen', 'The worst sub-index determines the overall AQI.'],
];

const REPORT_RULES: readonly (readonly [id: string, title: string, text: string])[] = [
  ['naqi-formula', 'Sub-index formula', 'Ip= [{(IHI - ILO)/ (BHI -BLO)} * (Cp-BLO)] +ILO'],
  [
    'naqi-minimum-data',
    'Data needed for an index',
    'Overall AQI is calculated only if data are available for minimum three pollutants out of which one should necessarily be either PM2.5 or PM10. Else, data are considered insufficient for calculating AQI. Similarly, a minimum of 16 hours’ data is considered necessary for calculating subindex.',
  ],
];

function bandFacts([id, name, low, high]: Band): Fact[] {
  const health = HEALTH[id];
  const source = NAQI_REPORT;
  return [
    {
      kind: 'number',
      id: `naqi-band-${id}`,
      title: name,
      value: low,
      range: { low, high },
      unit: 'index',
      source,
    },
    {
      kind: 'text',
      id: `naqi-health-${id}`,
      title: `Health statement for ${name}`,
      text: health,
      lang: 'en',
      source,
    },
  ];
}

function breakpointFacts([id, label, unit, hours, cells]: Pollutant): Fact[] {
  const rows = cells.split(' ').map((cell) => cell.split('-').map(Number));
  const top = Math.max(...rows.flat());
  return BANDS.map(([band, name], index): Fact => {
    const [low = 0, high = top] = rows[index] ?? [];
    const above = index === rows.length;
    const title = `${label} ${String(hours)} hour mean for ${name}${above ? `, above ${String(top)}` : ''}`;
    const range = above ? null : { low, high };
    const value = above ? top : low;
    return { kind: 'number', id: `naqi-${id}-${band}`, title, value, range, unit, source: NAQI_REPORT };
  });
}

const rule = ([id, title, text]: readonly [string, string, string], fromReport: boolean): Fact => ({
  kind: 'text',
  id,
  title,
  text,
  lang: 'en',
  source: fromReport ? NAQI_REPORT : ABOUT_AQI,
});

/** The NAQI facts: six bands with their health statements, the breakpoints of seven pollutants and the rules. */
export const NAQI_FACTS: readonly Fact[] = [
  ...BANDS.flatMap(bandFacts),
  ...BREAKPOINTS.flatMap(breakpointFacts),
  ...RULES.map((entry) => rule(entry, false)),
  ...REPORT_RULES.map((entry) => rule(entry, true)),
];
