// Tests for the plan context of a request: today in IST and the current time as the earliest move, the air basis,
// and the what-if context, which recomputes in the browser exactly what the server computed.
import { describe, expect, it } from 'vitest';
import type { AirResponse } from '../../../src/features/air/types.js';
import { buildCandidates } from '../../../src/features/planner/candidates.js';
import { airBasisOf, contextAt, whatIfContextOf } from '../../../src/features/planner/request-context.js';
import { whatIfEffects } from '../../../src/features/planner/what-if.js';
import { hourCurve } from '../../support/fake-air.js';
import { sample, winterDay } from '../../support/plan-fixtures.js';
import { modelledReading, stationReading } from '../community/support.js';

const NOW = Date.parse('2026-11-24T06:10:00+05:30');
const feed: AirResponse['feed'] = { fetch: 'ok', feedHour: null, stale: false };

function air(reading: AirResponse['reading'], withCurve = true): AirResponse {
  return { reading, feed, forecast: withCurve ? hourCurve(winterDay()) : null, grap: null };
}

describe('contextAt', () => {
  it('plans for the IST date of now, from the current IST minute, in the band of the reading', () => {
    const ctx = contextAt(sample('family-car-asthma'), air(stationReading('very_poor')), NOW);
    expect(ctx).toMatchObject({ date: '2026-11-24', notBefore: '06:10', band: 'very_poor' });
    const lateNight = contextAt(
      sample('family-car-asthma'),
      air(stationReading(null)),
      Date.parse('2026-11-24T23:30:00+05:30'),
    );
    expect(lateNight).toMatchObject({ date: '2026-11-24', notBefore: '23:30', band: null });
  });
});

describe('airBasisOf', () => {
  it('names the path, band, hour of the reading and when the forecast was fetched', () => {
    expect(airBasisOf(air(stationReading('severe')))).toEqual({
      path: 'station',
      band: 'severe',
      readingHour: '2026-11-26T06:00:00+05:30',
      forecastIssuedAt: '2026-11-24T00:00:00+05:30',
    });
    expect(airBasisOf(air(modelledReading('moderate'), false))).toMatchObject({
      path: 'modelled',
      readingHour: '2026-11-26T05:00:00+05:30',
      forecastIssuedAt: null,
    });
    expect(airBasisOf(air({ path: 'unavailable', reason: 'feed_and_model_down' }, false))).toEqual({
      path: 'unavailable',
      band: null,
      readingHour: null,
      forecastIssuedAt: null,
    });
  });
});

describe('whatIfContextOf', () => {
  it('keeps only the hours of the plan date, and with them a toggle gives the effects the server gave', () => {
    const household = sample('family-car-asthma');
    const ctx = contextAt(household, air(stationReading('severe')), NOW);
    const sent = whatIfContextOf(ctx);
    expect(sent.notBefore).toBe('06:10');
    expect(sent.curve?.hours).toHaveLength(25);
    const browser = { household, band: ctx.band, date: ctx.date, ...sent };
    const toggles = buildCandidates(ctx).actions.flatMap((action) => action.whatIfs);
    expect(toggles.length).toBeGreaterThan(0);
    for (const toggle of toggles) {
      expect(whatIfEffects(browser, toggle.patch)).toEqual(whatIfEffects(ctx, toggle.patch));
    }
    expect(whatIfContextOf({ ...ctx, curve: null }).curve).toBeNull();
  });
});
