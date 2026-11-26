// English text for community actions and the notice frame, as data. Templates hold no digits: every number
// enters through a {placeholder} whose value carries its fact id.
import type { AqiBand } from '../naqi/types.js';
import type { ActionId } from './rules.js';
import type { CommunityKind } from './types.js';

/** A value that differs by kind of community. */
export type PerKind<T = string> = Readonly<Record<CommunityKind, T>>;

/** The same value for a school and a society. */
export function same<T>(value: T): PerKind<T> {
  return { school: value, housing_society: value };
}

/** English text and cited facts for one action. line is the notice sentence; detail gives the reason. */
export interface ActionText {
  readonly title: PerKind;
  readonly line: PerKind;
  readonly detail: PerKind;
  readonly factIds: PerKind<readonly string[]>;
}

/** What the opening line can say about the reading. */
export type ReadingState = 'station' | 'station_no_aqi' | 'modelled' | 'none';

/** The code-written parts of a notice in one language. */
export interface FrameText {
  readonly title: PerKind;
  readonly greeting: PerKind;
  readonly reading: Readonly<Record<ReadingState, string>>;
  readonly stale: string;
  readonly closing: PerKind;
}

/** CPCB band names. */
export const BAND_EN: Readonly<Record<AqiBand, string>> = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderate: 'Moderate',
  poor: 'Poor',
  very_poor: 'Very Poor',
  severe: 'Severe',
};

const BAND_FACTS = ['community-advice-{bandSlug}-general', 'community-advice-{bandSlug}-vulnerable'];
const STAY_IN = 'The health ministry advises staying indoors on days with poor to severe AQI.';

/** English text for the day's actions: advice, timing, windows. */
export const ACTIONS_EN_DAY = {
  'health-advice': {
    title: same('Follow the health advice for {band} air'),
    line: {
      school:
        'Health advice for {band} air. For pupils, and for staff who are pregnant, older or have heart or lung illness, "{vuln}". For other staff, "{gen}".',
      housing_society:
        'Health advice for {band} air. For children, older people, pregnant women and people with heart or lung illness, "{vuln}". For everyone else, "{gen}".',
    },
    detail: same(
      "These are the health ministry's words for {band} air. Its advisory counts children, older people, pregnant women, people with heart or lung illness and outdoor workers as vulnerable.",
    ),
    factIds: same([...BAND_FACTS, 'community-advice-vulnerable-groups']),
  },
  'normal-day': {
    title: same('Normal activity is fine today'),
    line: {
      school: 'Assembly, outdoor periods and games can go ahead as usual today.',
      housing_society: 'Outdoor activities can go ahead as usual today.',
    },
    detail: same(
      'The air is {band}. At this level the health ministry advises no special precautions for most people.',
    ),
    factIds: same(BAND_FACTS),
  },
  'check-reading': {
    title: same('Check the AQI before outdoor activity'),
    line: same(
      'Check the AQI again before outdoor activity today, and follow the health advice for that band.',
    ),
    detail: same(
      'No reading is available now. The health ministry advises rescheduling outdoor activities as per the AQI.',
    ),
    factIds: same(['community-advice-reschedule']),
  },
  'assembly-indoors': {
    title: {
      school: 'Hold the {assembly} assembly indoors',
      housing_society: 'Hold the {assembly} gathering indoors',
    },
    line: {
      school: 'Today, hold the {assembly} assembly indoors, in classrooms or the hall.',
      housing_society: 'Today, hold the {assembly} gathering indoors or put it off.',
    },
    detail: {
      school: 'The health ministry asks schools to limit outdoor activities when the AQI is poor or worse.',
      housing_society: STAY_IN,
    },
    factIds: {
      school: ['community-advice-school-outdoor', 'community-advice-reschedule'],
      housing_society: ['community-advice-reschedule'],
    },
  },
  'outdoor-indoors': {
    title: same('Move outdoor activity indoors'),
    line: {
      school: 'Today, hold outdoor activity at {periodTimes} indoors, and keep breaks indoors too.',
      housing_society: 'Today, move outdoor activity at {periodTimes} indoors or put it off.',
    },
    detail: {
      school:
        'When the AQI is poor or worse, the health ministry asks schools to keep break sessions indoors and to avoid or postpone running, jogging and play.',
      housing_society: STAY_IN,
    },
    factIds: {
      school: ['community-advice-school-outdoor', 'community-advice-reschedule'],
      housing_society: ['community-advice-reschedule'],
    },
  },
} satisfies Partial<Record<ActionId, ActionText>>;
