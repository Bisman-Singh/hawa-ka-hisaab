// Compares two households' plans made on the same air and names the differences worth calling out:
// who is protected, what moved, what stays indoors, travel changes, the largest cut and the indoor steps.
import { err, ok, type Result } from '../../lib/result.js';
import { describeMember, membersOf } from '../household/members.js';
import type { Household } from '../household/types.js';
import { effectDisplay } from '../ledger/display.js';
import { fill } from '../../lib/template.js';
import { planItems } from './assemble.js';
import { activityName } from './text.js';
import type { AirBasis, Plan, PlanItem } from './types.js';
import WORDS from './words/compare.json' with { type: 'json' };

/** One side of a comparison: the household, its plan and the air the plan was built on. */
export interface ComparedPlan {
  readonly household: Household;
  readonly plan: Plan;
  readonly airBasis: AirBasis;
}

/** What a difference is about. */
export type CompareTopic = 'protected' | 'moved' | 'indoors' | 'travel' | 'largest_cut' | 'indoor_steps';

/** A difference between the two plans, in plain words for each side. */
export interface PlanDifference {
  readonly topic: CompareTopic;
  readonly left: string;
  readonly right: string;
}

const ofKind = (side: ComparedPlan, kinds: readonly PlanItem['kind'][]): PlanItem[] =>
  planItems(side.plan).filter((item) => kinds.includes(item.kind));

function nameOf(side: ComparedPlan, item: PlanItem): string {
  const activity = side.household.activities.find((found) => found.id === item.activityId);
  return activity ? activityName(activity) : item.title;
}

function largestCut(side: ComparedPlan): string[] {
  const cuts = planItems(side.plan).flatMap((item) =>
    item.effects.flatMap((effect) =>
      effect.kind === 'exposure' && effect.change.high < 0 ? [{ item, effect }] : [],
    ),
  );
  const best = cuts.sort((a, b) => a.effect.change.low - b.effect.change.low)[0];
  return best
    ? [fill(WORDS.cutFor, { cut: effectDisplay(best.effect).headline, name: nameOf(side, best.item) })]
    : [];
}

const ITEMS: Readonly<Record<CompareTopic, (side: ComparedPlan) => string[]>> = {
  protected: (side) =>
    membersOf(
      side.household,
      ofKind(side, ['protect', 'move_indoors']).flatMap((item) => item.memberIds),
    ).map(describeMember),
  moved: (side) =>
    ofKind(side, ['reschedule']).map((item) =>
      fill(WORDS.movedTo, { name: nameOf(side, item), time: item.start ?? '' }),
    ),
  indoors: (side) => ofKind(side, ['move_indoors']).map((item) => nameOf(side, item)),
  travel: (side) => ofKind(side, ['swap_mode']).map((item) => item.title),
  largest_cut: largestCut,
  indoor_steps: (side) => side.plan.indoor.map((step) => step.title),
};

/** The topics a comparison covers, in the order the page shows them. */
export const COMPARE_TOPICS: readonly CompareTopic[] = [
  'protected',
  'moved',
  'indoors',
  'travel',
  'largest_cut',
  'indoor_steps',
];

/** One side's words for a topic: its items once each, or the words for none. */
function summary(side: ComparedPlan, topic: CompareTopic): string {
  const items = ITEMS[topic](side);
  return items.length > 0 ? [...new Set(items)].join('; ') : WORDS.none[topic];
}

function sameAir(left: AirBasis, right: AirBasis): boolean {
  const keys: readonly (keyof AirBasis)[] = ['path', 'band', 'readingHour', 'forecastIssuedAt'];
  return keys.every((key) => left[key] === right[key]);
}

/** The differences between two plans made on the same air, or different_air when their air bases differ. */
export function comparePlans(
  left: ComparedPlan,
  right: ComparedPlan,
): Result<PlanDifference[], 'different_air'> {
  if (!sameAir(left.airBasis, right.airBasis)) {
    return err('different_air');
  }
  return ok(
    COMPARE_TOPICS.map((topic) => ({
      topic,
      left: summary(left, topic),
      right: summary(right, topic),
    })).filter((line) => line.left !== line.right),
  );
}
