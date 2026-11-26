// The health ministry advisory as only the community view quotes it: who is vulnerable, rescheduling, burning,
// schools and workers, and the airing hours as numbers. Text is verbatim; ... marks a passage left out.
import type { Fact, Range, Source } from '../../lib/types.js';
import { ADVISORY } from './sources.js';

/** A quoted passage as id, title and verbatim text. */
export type QuoteRow = readonly [string, string, string];

/** A number as id, title, value, unit and an optional range. */
export type NumberRow = readonly [string, string, number, string, Range?];

/** A text fact in English from a quote row. */
export function quoted(source: Source, [id, title, text]: QuoteRow): Fact {
  return { kind: 'text', id, title, text, lang: 'en', source };
}

/** A number fact from a number row. */
export function counted(source: Source, [id, title, value, unit, range]: NumberRow): Fact {
  return { kind: 'number', id, title, value, range: range ?? null, unit, source };
}

const QUOTES: readonly QuoteRow[] = [
  [
    'community-advice-vulnerable-groups',
    'Who the advisory counts as vulnerable',
    'Age group: Children particularly under 5 years and old age groups. Pregnant women: Exposure during pregnancy may have consequences for child in womb. Predisposed health conditions: Those with pre-existing illnesses of respiratory cardiovascular and cerebrovascular systems are at higher risk. ... Outdoor working groups: Those with possibility of prolonged exposures such as traffic policemen, traffic volunteers, construction workers, road sweepers, rickshaw pullers, auto-rickshaw drivers, roadside vendors, and others working outdoors in air polluted settings are at higher risk.',
  ],
  [
    'community-advice-reschedule',
    'Rescheduling outdoor activities by AQI',
    'Reschedule outdoor activities as per AQI, and remain indoors on days with poor to severe AQI.',
  ],
  [
    'community-advice-open-burning',
    'No open burning',
    'Avoid burning in the open environment of any form of wood, leaves, crop residues, and waste which can further worsen air pollution',
  ],
  [
    'community-advice-school-outdoor',
    'Outdoor activities in school when the AQI is poor or worse',
    'Precautions and avoidance of outdoor activities in school if AQI levels is poor and above: ... Schools to limit outdoor activities during days of higher pollution levels. During break sessions, stay indoors and minimize outdoor exposure. Physical activities like running, jogging, playing may be avoided or postponed. ...',
  ],
  [
    'community-advice-school-windows',
    'Classroom windows',
    'To close windows if air quality level is poor and above',
  ],
  [
    'community-advice-school-mopping',
    'Wet mopping in school',
    'To adopt wet mopping for floor cleaning in school or before students arrive to school',
  ],
  [
    'community-advice-school-gates',
    'School gates and transit',
    'Sites for precautions - transit from home to school, near school gates, and outdooring. ... To stay away from polluted sources like vehicular exhausts during transit to school.',
  ],
  [
    'community-advice-workers',
    'Employer steps for workers exposed outdoors',
    'Workers should be equipped with appropriate PPE, such as face masks and respirators, to protect themselves from airborne pollutants ... The workers need to be shifted/rotated in different job operations or different tasks to minimize extended exposure to high-dust environments. ... Provide regular breaks depending upon the assigned task for workers to reduce the harmful impact of air pollution on health.',
  ],
];

const NUMBERS: readonly NumberRow[] = [
  ['community-ventilation-from', 'Ventilation window opens', 12, 'hour, p.m.'],
  ['community-ventilation-until', 'Ventilation window closes', 4, 'hour, p.m.'],
  ['community-mask-class', 'Mask classes the advisory names', 95, 'mask class', { low: 95, high: 99 }],
];

/**
 * The advisory facts only the community view shows. Band advice, airing, wet mopping and masks are shared with
 * the plan and come from the advice tables.
 */
export const COMMUNITY_ADVICE: readonly Fact[] = [
  ...QUOTES.map((row) => quoted(ADVISORY, row)),
  ...NUMBERS.map((row) => counted(ADVISORY, row)),
];
