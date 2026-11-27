// Shared wording for the rules path: activity names, the band, quoted advice and the headline, in the plan's
// language. Numbers never go into this text except clock times; figures sit in effects with their working.
import { adviceFactId } from '../../config/facts/advice.js';
import { isVulnerable } from '../household/members.js';
import type { Activity, Member } from '../household/types.js';
import type { AqiBand } from '../naqi/types.js';
import type { Situation } from './context.js';
import { LEXICON_EN } from './words-lexicon.js';
import { groupOf, nameOf, say } from './words.js';

/** What to call an activity in English: its own short label, or a plain name for its kind. */
export function activityName(activity: Activity): string {
  return activity.label ?? LEXICON_EN.kind[activity.kind];
}

/** Text with its first letter in upper case. Text in a script without case is unchanged. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What to call an activity in the plan's language, and the same with a capital first letter for titles. */
export function namesIn(s: Situation, activity: Activity): { name: string; Name: string } {
  const name = nameOf(s.lex, s.ctx.household, activity);
  return { name, Name: capitalise(name) };
}

/** Health ministry advice for these members on the day's band, and the facts it quotes. Empty when unknown. */
export function adviceFor(s: Situation, members: readonly Member[]): { text: string; factIds: string[] } {
  const band = s.ctx.band;
  if (band === null) {
    return { text: '', factIds: [] };
  }
  const vulnerable = members.filter(isVulnerable);
  const general = members.length > vulnerable.length;
  const lines = [
    vulnerable.length > 0
      ? say(s.lex, 'advice_group', {
          group: groupOf(s.lex, vulnerable),
          advice: s.lex.advice(band, 'vulnerable'),
        })
      : '',
    general
      ? say(s.lex, vulnerable.length > 0 ? 'advice_rest' : 'advice_all', {
          advice: s.lex.advice(band, 'general'),
        })
      : '',
  ];
  const ids = [
    ...(vulnerable.length > 0 ? [adviceFactId(band, 'vulnerable'), 'advice-vulnerable-groups'] : []),
    ...(general ? [adviceFactId(band, 'general')] : []),
  ];
  return { text: lines.filter((line) => line !== '').join(' '), factIds: ids };
}

/** "The air is very poor today." for a known band, in the plan's language. */
export function airToday(s: Situation, band: AqiBand): string {
  return say(s.lex, 'air_today', { band: s.lex.band[band] });
}

function atRisk(s: Situation): string {
  const vulnerable = s.ctx.household.members.filter(isVulnerable);
  return vulnerable.length > 2 ? say(s.lex, 'group_at_risk') : groupOf(s.lex, vulnerable);
}

/** The plan headline on the rules path, by kind of day. A mild day says most things are fine. */
export function headlineFor(s: Situation): string {
  const band = s.ctx.band;
  if (band === null) {
    return say(s.lex, 'headline_unknown');
  }
  const values = { airToday: airToday(s, band), group: atRisk(s) };
  const hasVulnerable = s.ctx.household.members.some(isVulnerable);
  if (s.dayKind === 'mild') {
    return say(s.lex, 'headline_mild', values);
  }
  if (s.dayKind === 'moderate') {
    return say(s.lex, hasVulnerable ? 'headline_moderate_group' : 'headline_moderate', values);
  }
  if (!hasVulnerable) {
    return say(s.lex, 'headline_severe', values);
  }
  return say(s.lex, onlyAtWork(s) ? 'headline_severe_work' : 'headline_severe_group', values);
}

/** True when every vulnerable member's day outside is fixed outdoor work, which staying in cannot replace. */
function onlyAtWork(s: Situation): boolean {
  const { activities, members } = s.ctx.household;
  return members.filter(isVulnerable).every((member) => {
    const outside = activities.filter(
      (activity) => activity.memberIds.includes(member.id) && activity.setting !== 'indoor',
    );
    return (
      outside.length > 0 &&
      outside.every((activity) => activity.kind === 'outdoor_work' && activity.timing === 'fixed')
    );
  });
}
