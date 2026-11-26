// Shared English wording for the rules path: activity names, band words, quoted advice and the headline.
// Numbers never go into this text except clock times; figures sit in effects with their working.
import { adviceFactId, adviceText } from '../../config/facts/advice.js';
import { describeGroup, isVulnerable } from '../household/members.js';
import type { Activity, ActivityKind, Member } from '../household/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { Situation } from './context.js';

const KIND_NAME: Readonly<Record<ActivityKind, string>> = {
  commute: 'the commute',
  school_run: 'the school run',
  outdoor_exercise: 'outdoor exercise',
  outdoor_play: 'outdoor play',
  outdoor_work: 'outdoor work',
  errand: 'the errand',
  social: 'the outing',
  other: 'this activity',
};

/** What to call an activity: its own short label, or a plain name for its kind. */
export function activityName(activity: Activity): string {
  return activity.label ?? KIND_NAME[activity.kind];
}

/** Text with its first letter in upper case. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const BAND_WORD: Readonly<Record<AqiBand, string>> = {
  good: 'good',
  satisfactory: 'satisfactory',
  moderate: 'moderate',
  poor: 'poor',
  very_poor: 'very poor',
  severe: 'severe',
};

/** Quoted health ministry advice for these members on this band, and the facts it quotes. Empty when unknown. */
export function adviceFor(
  band: AqiBand | null,
  members: readonly Member[],
): { text: string; factIds: string[] } {
  if (band === null) {
    return { text: '', factIds: [] };
  }
  const vulnerable = members.filter(isVulnerable);
  const general = members.length - vulnerable.length;
  const lines = [
    vulnerable.length > 0
      ? `Health ministry advice for ${describeGroup(vulnerable)}: "${adviceText(band, 'vulnerable')}".`
      : '',
    general > 0
      ? `${vulnerable.length > 0 ? 'For everyone else' : 'Health ministry advice'}: "${adviceText(band, 'general')}".`
      : '',
  ];
  const ids = [
    ...(vulnerable.length > 0 ? [adviceFactId(band, 'vulnerable'), 'advice-vulnerable-groups'] : []),
    ...(general > 0 ? [adviceFactId(band, 'general')] : []),
  ];
  return { text: lines.filter((line) => line !== '').join(' '), factIds: ids };
}

/** "The air is very poor today." for a known band. */
export function airToday(band: AqiBand): string {
  return `The air is ${BAND_WORD[band]} today.`;
}

function atRisk(s: Situation): string {
  const vulnerable = s.ctx.household.members.filter(isVulnerable);
  return vulnerable.length > 2 ? 'the people most at risk' : describeGroup(vulnerable);
}

/** The plan headline on the rules path, by kind of day. A mild day says most things are fine. */
export function headlineFor(s: Situation): string {
  const band = s.ctx.band;
  if (band === null) {
    return 'We could not read the air for your place today. Nothing is moved; check the air card before going out.';
  }
  if (s.dayKind === 'mild') {
    return `${airToday(band)} Most things are fine as they are.`;
  }
  if (s.dayKind === 'moderate') {
    return `${airToday(band)} A few changes cut what your household breathes in.`;
  }
  const hasVulnerable = s.ctx.household.members.some(isVulnerable);
  return hasVulnerable
    ? `${airToday(band)} Keep ${atRisk(s)} indoors with activity low, and protect anyone who must go out.`
    : `${airToday(band)} Avoid outdoor exertion and use the cleaner hours for anything that must happen outside.`;
}
