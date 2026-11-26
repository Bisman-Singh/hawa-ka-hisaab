// Health ministry advice by AQI band for the general and the vulnerable population, quoted from its table.
import type { Fact } from '../../lib/types.js';
import { quoteFact } from './build.js';
import { ADVISORY } from './sources.js';

/** The six NAQI bands, mildest first, as the advisory's table lists them. */
export type AdviceBand = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very_poor' | 'severe';

/** Who a piece of band advice is for. */
export type AdviceGroup = 'general' | 'vulnerable';

const WORDING: Readonly<Record<AdviceBand, Readonly<Record<AdviceGroup, string>>>> = {
  good: { general: 'No special precautions', vulnerable: 'No special precautions' },
  satisfactory: {
    general: 'No special precautions',
    vulnerable: 'Do less prolonged or strenuous outdoor physical exertion',
  },
  moderate: {
    general: 'Do less prolonged or strenuous outdoor physical exertion',
    vulnerable: 'Avoid prolonged or strenuous outdoor physical exertion',
  },
  poor: { general: 'Avoid outdoor physical exertion', vulnerable: 'Avoid outdoor physical activities' },
  very_poor: {
    general: 'Avoid outdoor physical activities, especially during morning and late evening hours',
    vulnerable: 'Remain indoors and keep activity levels low',
  },
  severe: {
    general: 'Avoid outdoor physical activities',
    vulnerable: 'Remain indoors and keep activity levels low',
  },
};

const BAND_NAME: Readonly<Record<AdviceBand, string>> = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderate: 'Moderate',
  poor: 'Poor',
  very_poor: 'Very Poor',
  severe: 'Severe',
};

/** The id of the advice fact for a band and group, such as advice-very-poor-vulnerable. */
export function adviceFactId(band: AdviceBand, group: AdviceGroup): string {
  return `advice-${band.replace('_', '-')}-${group}`;
}

/** The advice wording for a band and group, word for word. */
export function adviceText(band: AdviceBand, group: AdviceGroup): string {
  return WORDING[band][group];
}

const GROUP_TITLE: Readonly<Record<AdviceGroup, string>> = {
  general: 'general population',
  vulnerable: 'vulnerable population',
};

const BANDS: readonly AdviceBand[] = ['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe'];
const GROUPS: readonly AdviceGroup[] = ['general', 'vulnerable'];

/** Twelve facts: the advice for each band and group, from the advisory's table of protective measures. */
export const ADVICE_FACTS: readonly Fact[] = [
  ...BANDS.flatMap((band) =>
    GROUPS.map((group) =>
      quoteFact(
        {
          id: adviceFactId(band, group),
          title: `Health ministry advice for the ${GROUP_TITLE[group]} on a ${BAND_NAME[band]} AQI day`,
          text: adviceText(band, group),
        },
        ADVISORY,
      ),
    ),
  ),
  quoteFact(
    {
      id: 'advice-vulnerable-groups',
      title: 'Who the health ministry counts as vulnerable, from its covering letter',
      text: 'Vulnerable populations including children, pregnant women, the elderly, individuals with pre-existing conditions, and workers exposed to pollution are particularly at risk.',
    },
    ADVISORY,
  ),
];
