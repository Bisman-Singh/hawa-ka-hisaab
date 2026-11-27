// The words of the privacy and about-the-data pages, from words.json. Credit lines, source titles and the emergency
// number are read from the facts registry, never written here.
import { STATION_RADIUS_KM } from '../../config/limits.js';
import { fill } from '../../lib/template.js';
import WORDS from './words.json' with { type: 'json' };

/** Where questions and requests about data go: the repository's issue page. Null until its address is set. */
export const ISSUES_URL: string | null = WORDS.issuesUrl;

/** Google's terms for the Gemini API, which the free tier statements are read from. */
export const GEMINI_TERMS_URL = WORDS.geminiTermsUrl;

/** Strings of the privacy page. */
export const PRIVACY = WORDS.privacy;

/** Strings of the about-the-data page, with the station radius filled in. */
export const ABOUT = {
  ...WORDS.about,
  modelledText: fill(WORDS.about.modelledText, { radius: STATION_RADIUS_KM }),
};
