// The plan context for a household at the moment of a request, the air basis the response reports, and what the
// browser needs to recompute what-ifs with the same pure functions.
import { istIso } from '../air/geo.js';
import { readingBand } from '../air/reading-facts.js';
import type { AirResponse, HourCurve } from '../air/types.js';
import type { Household } from '../household/types.js';
import type { PlanContext } from './context.js';
import type { AirBasis, WhatIfContext } from './types.js';

const DAY_MS = 86_400_000;

/** The context for a plan made now: today's IST date, the current IST time as the earliest move, and the air. */
export function contextAt(household: Household, air: AirResponse, now: number): PlanContext {
  const ist = istIso(now);
  return {
    household,
    band: readingBand(air.reading),
    curve: air.forecast,
    date: ist.slice(0, 10),
    notBefore: ist.slice(11, 16),
  };
}

/** The reading and forecast the plan was built on. */
export function airBasisOf(air: AirResponse): AirBasis {
  const { reading } = air;
  const hour = reading.path === 'station' ? reading.readingHour : null;
  return {
    path: reading.path,
    band: readingBand(reading),
    readingHour: reading.path === 'modelled' ? reading.modelHour : hour,
    forecastIssuedAt: air.forecast?.issuedAt ?? null,
  };
}

/**
 * The curve hours of the plan's own date, midnight to midnight, which are all the planner reads, and the earliest
 * move time. With these, the plan's band, date and the household, whatIfEffects gives what the server gives.
 */
export function whatIfContextOf(ctx: PlanContext): WhatIfContext {
  const midnight = Date.parse(`${ctx.date}T00:00:00+05:30`);
  const inDay = (time: string): boolean => {
    const at = Date.parse(time);
    return at >= midnight && at <= midnight + DAY_MS;
  };
  const curve: HourCurve | null =
    ctx.curve === null ? null : { ...ctx.curve, hours: ctx.curve.hours.filter((row) => inDay(row.time)) };
  return { curve, notBefore: ctx.notBefore };
}
