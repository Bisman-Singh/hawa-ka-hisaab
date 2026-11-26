// The calculators the model may call to answer a question, bound to one household and its plan. Each takes ids
// from the household and a mode from a closed list, never a free number, and returns only figures the plan shows.
import { z } from 'zod';
import type { FactValue } from '../../lib/types.js';
import { defineTool, type ModelTool } from '../../lib/model.js';
import { localIdSchema } from '../household/schemas.js';
import type { Household } from '../household/types.js';
import { formatEffect } from '../ledger/format.js';
import { purifierNeed } from '../ledger/purifier.js';
import type { Effect } from '../ledger/types.js';
import type { CandidateSet, PlanContext } from '../planner/context.js';
import { clock, value } from '../planner/fact-values.js';
import { activityName } from '../planner/text.js';
import { whatIfEffects } from '../planner/what-if.js';

/** Modes a trip may be switched to in a question: the low-emission ones the plan itself suggests. */
export const switchModeSchema = z.enum(['walk', 'cycle', 'bus', 'metro']);

const citedBy = (effects: readonly Effect[], more: readonly string[] = []): string[] => [
  ...new Set([...more, ...effects.flatMap((effect) => effect.working.factIds)]),
];

const NOT_FOUND = { found: false };

function optionsFor(set: CandidateSet, activityId: string) {
  const options = set.actions.filter((action) => action.activityId === activityId);
  return {
    options: options.map((option) => ({
      kind: option.kind,
      start: option.start,
      title: option.template.title,
      why: option.template.why,
      effects: option.effects.map(formatEffect),
    })),
    factIds: citedBy(
      options.flatMap((option) => option.effects),
      options.flatMap((option) => option.factIds),
    ),
  };
}

function activityOptions(ctx: PlanContext, set: CandidateSet): ModelTool {
  return defineTool({
    name: 'activity_options',
    description:
      "What the plan suggests for one of the household's activities: each option with its time and its effects as the plan shows them.",
    parameters: z.strictObject({ activityId: localIdSchema }),
    run: ({ activityId }) => {
      const activity = ctx.household.activities.find((found) => found.id === activityId);
      return activity
        ? {
            found: true,
            activity: activityName(activity),
            start: activity.start,
            ...optionsFor(set, activityId),
          }
        : NOT_FOUND;
    },
  });
}

function switchTravel(ctx: PlanContext): ModelTool {
  return defineTool({
    name: 'switch_travel',
    description:
      "The effects of making one activity's trip by another mode, as the plan's what-if toggles work them out. A mode with no cited CO2 factor gives no CO2 figure.",
    parameters: z.strictObject({ activityId: localIdSchema, mode: switchModeSchema }),
    run: ({ activityId, mode }) => {
      const effects = whatIfEffects(ctx, { op: 'set_travel_mode', activityId, mode, fuel: null });
      if (!effects.ok) {
        return NOT_FOUND;
      }
      const co2 = effects.value.some((effect) => effect.kind === 'co2');
      const shown = effects.value.map(formatEffect);
      return { found: true, mode, co2Figure: co2, effects: shown, factIds: citedBy(effects.value) };
    },
  });
}

function roomPurifier(household: Household): ModelTool {
  return defineTool({
    name: 'room_purifier',
    description:
      'The smallest purifier CADR a room of the household needs, by EPA sizing, and whether its purifier meets it.',
    parameters: z.strictObject({ roomId: localIdSchema }),
    run: ({ roomId }) => {
      const room = household.home.rooms.find((found) => found.id === roomId);
      const area = room?.areaSqFt ?? null;
      if (area === null) {
        return NOT_FOUND;
      }
      const need = purifierNeed(area);
      const cadr = room?.purifier?.cadrM3PerHour ?? null;
      return {
        found: true,
        areaSqFt: area,
        neededCadrM3PerHour: Math.round(need.value),
        purifierCadrM3PerHour: cadr,
        meetsNeed: cadr === null ? null : cadr >= need.value,
        factIds: need.working.factIds,
      };
    },
  });
}

/** The three calculators for a question, bound to this household, its air and the candidates of its plan. */
export function askTools(ctx: PlanContext, set: CandidateSet): ModelTool[] {
  return [activityOptions(ctx, set), switchTravel(ctx), roomPurifier(ctx.household)];
}

type Row = readonly [id: string, label: string, unit: string, amount: number | null | undefined];

/**
 * The numbers of the household as entered: every activity's start, length, distance and riders, and every room's
 * area and purifier. A question's answer may repeat these, so they go in the facts the trace shows.
 */
export function householdFacts(household: Household): FactValue[] {
  const rows: Row[] = [
    ...household.activities.flatMap((activity): Row[] => [
      [activity.id, 'Minutes as entered', 'minutes', activity.durationMinutes],
      [activity.id, 'Distance one way', 'km', activity.travel?.distanceKm],
      [activity.id, 'People in the vehicle', 'people', activity.travel?.occupancy],
    ]),
    ...household.home.rooms.flatMap((room): Row[] => [
      [room.id, 'Room area', 'sq ft', room.areaSqFt],
      [room.id, 'Purifier CADR', 'm3/h', room.purifier?.cadrM3PerHour],
    ]),
  ];
  const starts = household.activities.flatMap((activity) =>
    clock(activity.id, 'Start time as entered', activity.start),
  );
  const amounts = rows.flatMap(([id, label, unit, amount]) =>
    typeof amount === 'number' ? [value({ id, label, unit }, amount)] : [],
  );
  return [...starts, ...amounts];
}
