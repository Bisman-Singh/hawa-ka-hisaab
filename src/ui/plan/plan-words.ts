// Words for the household on the plan screens: activity titles, who an item is for, whether its time can move and
// the people in short, in the plan's language where the plan shows them.
import { describeMember, membersOf } from '../../features/household/members.js';
import type { Activity, Household, Member } from '../../features/household/types.js';
import { fill } from '../../lib/template.js';
import { activityName, capitalise } from '../../features/planner/text.js';
import type { PlanItem } from '../../features/planner/types.js';
import { lexiconFor, nameOf } from '../../features/planner/words.js';
import { PEOPLE_EN } from '../../features/planner/words-people.js';
import type { Language } from '../../lib/types.js';
import { PLAN_LABELS } from './words.js';
import { activityOf } from './plan-data.js';

/** What to call an activity in a title, in the plan's language. Hindi uses the plain name of its kind. */
export function activityTitle(household: Household, activity: Activity, language: Language): string {
  return capitalise(
    language === 'en' ? activityName(activity) : nameOf(lexiconFor(language), household, activity),
  );
}

/** The people an item is for and how long it takes, in plain words in the plan's language. */
export function whoLine(household: Household, item: PlanItem, language: Language = 'en'): string {
  const people = membersOf(household, item.memberIds).map(lexiconFor(language).people.member).join(', ');
  const activity = activityOf(household, item.activityId);
  const minutes = (count: number): string => fill(PLAN_LABELS[language].minutes, { count: String(count) });
  return activity ? `${people}, ${minutes(activity.durationMinutes)}` : people;
}

/** Whether the time of an item can move, from the household's own answer; a move says where it came from. */
export function fixityOf(household: Household, item: PlanItem, language: Language = 'en'): string {
  const words = PLAN_LABELS[language];
  const activity = activityOf(household, item.activityId);
  if (item.kind === 'reschedule' && activity) {
    return fill(words.from, { time: activity.start });
  }
  return activity?.timing === 'fixed' ? words.fixed : words.canMove;
}

/** The people of a household in short, those described alike counted together, such as "2 adults; older adult". */
export function peopleLine(members: readonly Member[]): string {
  const alike = new Map<string, { member: Member; count: number }>();
  for (const member of members) {
    const text = describeMember(member);
    alike.set(text, { member, count: (alike.get(text)?.count ?? 0) + 1 });
  }
  return [...alike]
    .map(([text, { member, count }]) => {
      const many = text
        .replace(describeMember({ ...member, flags: [] }), PEOPLE_EN.plural[member.ageGroup])
        .replace('who works', 'who work');
      return count === 1 ? text : `${String(count)} ${many}`;
    })
    .join('; ');
}
