// Compares two households' plans made on the same air and names the differences worth calling out:
// who is protected, what moved, what stays indoors, travel changes, the largest cut and the indoor steps.
import { err, ok, type Result } from '../../lib/result.js';
import { describeMember, membersOf } from '../household/members.js';
import type { Household } from '../household/types.js';
import { describeChange } from '../ledger/format.js';
import { activityName } from './text.js';
import type { AirBasis, Plan, PlanItem } from './types.js';

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

const itemsOf = (plan: Plan): PlanItem[] => [
  ...plan.slots.morning,
  ...plan.slots.afternoon,
  ...plan.slots.evening,
];

function listOr(values: readonly string[], none: string): string {
  return values.length > 0 ? [...new Set(values)].join('; ') : none;
}

function nameOf(side: ComparedPlan, item: PlanItem): string {
  const activity = side.household.activities.find((found) => found.id === item.activityId);
  return activity ? activityName(activity) : item.title;
}

function protectedMembers(side: ComparedPlan): string {
  const ids = itemsOf(side.plan)
    .filter((item) => item.kind === 'protect' || item.kind === 'move_indoors')
    .flatMap((item) => item.memberIds);
  return listOr(membersOf(side.household, ids).map(describeMember), 'No one needs extra protection');
}

function largestCut(side: ComparedPlan): string {
  const cuts = itemsOf(side.plan).flatMap((item) =>
    item.effects.flatMap((effect) =>
      effect.kind === 'exposure' && effect.change.high < 0 ? [{ item, effect }] : [],
    ),
  );
  const best = cuts.sort((a, b) => a.effect.change.low - b.effect.change.low)[0];
  return best
    ? `${describeChange(best.effect.change)}, for ${nameOf(side, best.item)}`
    : 'No cut in what is breathed in';
}

const SUMMARY: Readonly<Record<CompareTopic, (side: ComparedPlan) => string>> = {
  protected: protectedMembers,
  moved: (side) =>
    listOr(
      itemsOf(side.plan).flatMap((item) =>
        item.kind === 'reschedule' ? [`${nameOf(side, item)} to ${item.start ?? ''}`] : [],
      ),
      'Nothing moved',
    ),
  indoors: (side) =>
    listOr(
      itemsOf(side.plan).flatMap((item) => (item.kind === 'move_indoors' ? [nameOf(side, item)] : [])),
      'Nothing kept indoors',
    ),
  travel: (side) =>
    listOr(
      itemsOf(side.plan).flatMap((item) => (item.kind === 'swap_mode' ? [item.title] : [])),
      'No travel change',
    ),
  largest_cut: largestCut,
  indoor_steps: (side) =>
    listOr(
      side.plan.indoor.map((step) => step.title),
      'No indoor steps',
    ),
};

const TOPICS: readonly CompareTopic[] = [
  'protected',
  'moved',
  'indoors',
  'travel',
  'largest_cut',
  'indoor_steps',
];

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
    TOPICS.map((topic) => ({ topic, left: SUMMARY[topic](left), right: SUMMARY[topic](right) })).filter(
      (line) => line.left !== line.right,
    ),
  );
}
