// The health ministry advice for today's band as one sentence a reply can end with, in English or Hindi. It uses
// the community notice's wording for the same advice, so the app says it one way everywhere.
import { adviceFactId, adviceText } from '../../config/facts/advice.js';
import { fill } from '../../lib/template.js';
import type { Language } from '../../lib/types.js';
import { ACTIONS, ADVICE_HI, BAND_HI_BEFORE_NOUN, BAND_NAMES, forKind } from '../community/words.js';
import type { AqiBand } from '../naqi/types.js';

/** The advice sentence and the facts it quotes. */
export interface BandAdvice {
  readonly text: string;
  readonly factIds: readonly string[];
}

/**
 * The advice for the band, for vulnerable people and for everyone else. English quotes the advisory word for word;
 * Hindi is the notice's rendering of the same words.
 */
export function bandAdvice(band: AqiBand, language: Language): BandAdvice {
  const english = language === 'en';
  const words = {
    band: english ? BAND_NAMES.en[band] : BAND_HI_BEFORE_NOUN[band],
    vuln: english ? adviceText(band, 'vulnerable') : ADVICE_HI[band].vulnerable,
    gen: english ? adviceText(band, 'general') : ADVICE_HI[band].general,
  };
  return {
    text: fill(forKind(ACTIONS['health-advice'].line[language], 'housing_society'), words),
    factIds: [adviceFactId(band, 'vulnerable'), adviceFactId(band, 'general'), 'advice-vulnerable-groups'],
  };
}
