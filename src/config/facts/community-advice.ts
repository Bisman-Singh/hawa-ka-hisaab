// The health ministry advisory as the community view quotes it: advice by band, who is vulnerable, windows,
// mopping, burning, masks, schools and workers. Text is verbatim; ... marks a passage left out.
import type { Fact, Range, Source } from '../../lib/types.js';

/** The advisory every fact in this file comes from. */
export const MOHFW: Source = {
  title: 'Health Advisory on Air Pollution under NPCCHH, D.O. dated 01.11.2025',
  publisher: 'Ministry of Health and Family Welfare, National Centre for Disease Control',
  url: 'https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf',
  published: '1 Nov 2025',
  retrieved: '2026-11-23',
};

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

const NO_SPECIAL = 'No special precautions';
const LESS = 'Do less prolonged or strenuous outdoor physical exertion';
const AVOID_ACTIVITIES = 'Avoid outdoor physical activities';
const INDOORS = 'Remain indoors and keep activity levels low';

const BAND_ADVICE: readonly (readonly [string, string, string, string])[] = [
  ['good', 'Good', NO_SPECIAL, NO_SPECIAL],
  ['satisfactory', 'Satisfactory', NO_SPECIAL, LESS],
  ['moderate', 'Moderate', LESS, 'Avoid prolonged or strenuous outdoor physical exertion'],
  ['poor', 'Poor', 'Avoid outdoor physical exertion', AVOID_ACTIVITIES],
  [
    'very-poor',
    'Very Poor',
    `${AVOID_ACTIVITIES}, especially during morning and late evening hours`,
    INDOORS,
  ],
  ['severe', 'Severe', AVOID_ACTIVITIES, INDOORS],
];

const QUOTES: readonly QuoteRow[] = [
  [
    'community-advice-vulnerable-groups',
    'Who the advisory counts as vulnerable',
    'Age group: Children particularly under 5 years and old age groups. Pregnant women: Exposure during pregnancy may have consequences for child in womb. Predisposed health conditions: Those with pre-existing illnesses of respiratory cardiovascular and cerebrovascular systems are at higher risk. ... Outdoor working groups: Those with possibility of prolonged exposures such as traffic policemen, traffic volunteers, construction workers, road sweepers, rickshaw pullers, auto-rickshaw drivers, roadside vendors, and others working outdoors in air polluted settings are at higher risk.',
  ],
  [
    'community-advice-ventilation',
    'When to keep windows shut and when to air rooms',
    'Avoid outdoor morning and late evening walk, run, jog and physical exercise, Do not open external doors and windows during morning and late evening hours, it may ventilate if necessary, between 12 p.m. to 4 p.m. in afternoon (Days with poor to severe AQI)',
  ],
  [
    'community-advice-reschedule',
    'Rescheduling outdoor activities by AQI',
    'Reschedule outdoor activities as per AQI, and remain indoors on days with poor to severe AQI.',
  ],
  [
    'community-advice-wet-mopping',
    'Wet mopping instead of sweeping',
    'Practice wet mopping instead of sweeping or vacuum inside homes to reduce exposure to air pollution.',
  ],
  [
    'community-advice-open-burning',
    'No open burning',
    'Avoid burning in the open environment of any form of wood, leaves, crop residues, and waste which can further worsen air pollution',
  ],
  [
    'community-advice-masks',
    'Masks',
    "If you choose to use face mask, the disposable N95 or N99 is useful provided user instructions are followed. These masks may help provided the period of exposure is short. Masks should have proper fitting on users' mouth and nose. Ensure to replace the masks after usage as instructed. Paper masks, handkerchiefs, scarves and cloth are not effective.",
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

/** Every advisory fact the community view shows. */
export const COMMUNITY_ADVICE: readonly Fact[] = [
  ...BAND_ADVICE.flatMap(([id, name, general, vulnerable]) => [
    quoted(MOHFW, [
      `community-advice-${id}-general`,
      `Advice for the general population, ${name} AQI`,
      general,
    ]),
    quoted(MOHFW, [
      `community-advice-${id}-vulnerable`,
      `Advice for the vulnerable population, ${name} AQI`,
      vulnerable,
    ]),
  ]),
  ...QUOTES.map((row) => quoted(MOHFW, row)),
  ...NUMBERS.map((row) => counted(MOHFW, row)),
];
