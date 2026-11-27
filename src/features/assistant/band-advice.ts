// The health ministry advice for today's band as one sentence a reply can end with, in English or Hindi. It uses
// the community notice's wording for the same advice, so the app says it one way everywhere.
import { adviceFactId, adviceText } from '../../config/facts/advice.js';
import type { Language } from '../../lib/types.js';
import { BAND_EN, ACTIONS_EN_DAY } from '../community/text-en.js';
import { ACTIONS_HI_DAY, ADVICE_HI, BAND_HI_BEFORE_NOUN } from '../community/text-hi.js';
import type { AqiBand } from '../naqi/types.js';

/** The advice sentence and the facts it quotes. */
export interface BandAdvice {
  readonly text: string;
  readonly factIds: readonly string[];
}

const TEMPLATE: Readonly<Record<Language, string>> = {
  en: ACTIONS_EN_DAY['health-advice'].line.housing_society,
  hi: ACTIONS_HI_DAY['health-advice'].housing_society,
};

/**
 * The advice for the band, for vulnerable people and for everyone else. English quotes the advisory word for word;
 * Hindi is the notice's rendering of the same words.
 */
export function bandAdvice(band: AqiBand, language: Language): BandAdvice {
  const english = language === 'en';
  const words = {
    band: english ? BAND_EN[band] : BAND_HI_BEFORE_NOUN[band],
    vuln: english ? adviceText(band, 'vulnerable') : ADVICE_HI[band].vulnerable,
    gen: english ? adviceText(band, 'general') : ADVICE_HI[band].general,
  };
  return {
    text: TEMPLATE[language].replace(/\{(band|vuln|gen)\}/gu, (_, name: keyof typeof words) => words[name]),
    factIds: [adviceFactId(band, 'vulnerable'), adviceFactId(band, 'general'), 'advice-vulnerable-groups'],
  };
}
