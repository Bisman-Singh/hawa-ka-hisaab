// Tests for placeholder values: each path of the reading, the timing and the place, with the facts behind them.
import { describe, expect, it } from 'vitest';
import type { AirReading } from '../../../src/features/air/types.js';
import type { Timing } from '../../../src/features/community/timing.js';
import { templateValues } from '../../../src/features/community/values.js';
import { context, fullSociety, modelledReading, stationReading, UNAVAILABLE } from './support.js';

const DAY = { band: null, timing: { window: null, periods: [] }, date: '2026-11-26' };

describe('templateValues', () => {
  it('reads the station name, its numbers, the reading hour and the AQI', () => {
    const values = templateValues(context({ reading: stationReading('poor') }), DAY);
    expect(values['station']).toMatchObject({
      en: 'Sector 62, Noida - IMD',
      facts: [{ id: 'air-station-name', value: 62 }],
    });
    expect(values['time']?.en).toBe('06:00');
    expect(values['aqi']).toMatchObject({ en: '246', facts: [{ id: 'air-aqi', value: 246 }] });
  });

  it('has no AQI value for a blank CPCB AQI or a model estimate that could not be made', () => {
    expect(templateValues(context({ reading: stationReading(null) }), DAY)['aqi']).toBeUndefined();
    const modelled = modelledReading('poor');
    const short: AirReading =
      modelled.path === 'modelled'
        ? { ...modelled, estimate: { status: 'insufficient', reason: 'no_particulate', available: ['no2'] } }
        : modelled;
    const values = templateValues(context({ reading: short }), DAY);
    expect(values['aqi']).toBeUndefined();
    expect(values['time']?.hi).toBe('05:00');
  });

  it('has no reading values when nothing answered', () => {
    const values = templateValues(context({ reading: UNAVAILABLE }), DAY);
    expect([values['station'], values['time'], values['aqi']]).toEqual([undefined, undefined, undefined]);
  });

  it('lists the period times in each language and gives the window from the forecast', () => {
    const timing: Timing = {
      window: { start: 13, end: 16 },
      periods: [
        { start: '06:20', worse: true },
        { start: '17:40', worse: true },
      ],
    };
    const values = templateValues(context({ community: fullSociety(), grap: null }), { ...DAY, timing });
    expect(values['periodTimes']).toMatchObject({ en: '06:20 and 17:40', hi: '06:20 और 17:40' });
    expect(values['winEnd']?.en).toBe('16:00');
    expect(values['winEnd']?.facts.map((fact) => [fact.id, fact.value])).toEqual([
      ['forecast-cleaner-window', 16],
      ['forecast-cleaner-window', 0],
    ]);
    expect([values['assembly'], values['stage'], values['vehicleMinutes']?.en]).toEqual([
      undefined,
      undefined,
      '583.5',
    ]);
  });

  it('gives a zero value for counts that were not entered and no gate values without a gate', () => {
    const community = { ...fullSociety(), generator: null, gateIdling: null, outdoorStaff: null };
    const values = templateValues(context({ community }), DAY);
    expect([values['hours']?.en, values['staff']?.en, values['vehicles']]).toEqual(['0', '0', undefined]);
  });

  it('gives the band, its advice in both languages and the GRAP order date', () => {
    const values = templateValues(context(), { ...DAY, band: 'very_poor' });
    expect(values['band']).toMatchObject({ en: 'Very Poor', hi: 'बहुत खराब' });
    expect(values['vuln']).toMatchObject({ en: 'Remain indoors and keep activity levels low' });
    expect(values['bandSlug']?.en).toBe('very-poor');
    expect(values['orderDate']).toMatchObject({ en: '17 Nov 2026', hi: '17 नवंबर 2026' });
    expect(values['date']?.facts.map((fact) => fact.value)).toEqual([26, 2026]);
  });
});
