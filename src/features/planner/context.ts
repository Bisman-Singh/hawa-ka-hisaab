// What a plan is built from, and the situation derived from it once: the day kind, the forecast by hour and
// who in the household the advisory counts as vulnerable.
import type { HourCurve } from '../air/types.js';
import { isVulnerable, membersOf } from '../household/members.js';
import type { Household, Member } from '../household/types.js';
import { minutesOf } from '../ledger/format.js';
import { dayCurve, type DayCurve } from '../ledger/curve.js';
import type { AqiBand } from '../naqi/types.js';
import { dayKindForBand, type DayKind } from './day-kind.js';
import type { Alternative, CandidateAction, IndoorStep } from './types.js';

/**
 * Everything a plan needs. band is the AQI band of the reading, null when unknown. curve is the forecast, null
 * when there is none. date is the IST date the plan is for. notBefore is the earliest IST clock time a move may
 * start at, such as the current time, or null for the whole day.
 */
export interface PlanContext {
  readonly household: Household;
  readonly band: AqiBand | null;
  readonly curve: HourCurve | null;
  readonly date: string;
  readonly notBefore: string | null;
}

/** The candidates code computed for a plan: actions the model may choose among, indoor steps and alternatives. */
export interface CandidateSet {
  readonly actions: readonly CandidateAction[];
  readonly indoor: readonly IndoorStep[];
  readonly alternatives: readonly Alternative[];
}

/** A plan context with what every rule needs worked out once. */
export interface Situation {
  readonly ctx: PlanContext;
  readonly dayKind: DayKind;
  readonly day: DayCurve;
  readonly notBefore: number;
}

/** Works out the day kind, the forecast by hour and the earliest start once. */
export function situationOf(ctx: PlanContext): Situation {
  return {
    ctx,
    dayKind: dayKindForBand(ctx.band),
    day: dayCurve(ctx.curve, ctx.date),
    notBefore: ctx.notBefore === null ? 0 : minutesOf(ctx.notBefore),
  };
}

const ORDER: readonly AqiBand[] = ['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe'];

/** True when the band is known and at least as bad as floor. */
export function bandAtLeast(band: AqiBand | null, floor: AqiBand): boolean {
  return band !== null && ORDER.indexOf(band) >= ORDER.indexOf(floor);
}

/** The members with these ids who the advisory counts as vulnerable. */
export function vulnerableAmong(s: Situation, ids: readonly string[]): Member[] {
  return membersOf(s.ctx.household, ids).filter(isVulnerable);
}
