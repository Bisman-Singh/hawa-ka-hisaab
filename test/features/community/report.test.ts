// Tests for building one community report: ranking, the cleaner window, readings, staleness and the seasons.
import { describe, expect, it } from 'vitest';
import { buildCommunityReport } from '../../../src/features/community/report.js';
import type { CommunityInput } from '../../../src/features/community/types.js';
import { context, fullSociety, grapNotice, modelledReading, stationReading, UNAVAILABLE } from './support.js';

describe('buildCommunityReport', () => {
  it('ranks every step a severe day calls for at a school in Delhi NCR in November', () => {
    const report = buildCommunityReport(context());
    expect(report.actions.map((action) => action.id)).toEqual([
      'health-advice',
      'assembly-indoors',
      'outdoor-indoors',
      'windows',
      'wet-mopping',
      'masks',
      'outdoor-staff',
      'no-idling',
      'stop-waste-burning',
      'generator-essential',
      'grap-stage',
      'grap-sports',
    ]);
    expect(report).toMatchObject({ kind: 'school', date: '2026-11-26', band: 'severe', dayKind: 'severe' });
    expect(report.notice.en.title).toBe('Air quality notice for parents and staff, 26 Nov 2026');
    expect(report.notice.hi?.title).toBe('अभिभावकों और स्टाफ के लिए वायु गुणवत्ता सूचना, 26 नवंबर 2026');
  });

  it('moves only the periods in the dirtier hours to the cleaner window on a Moderate day', () => {
    const report = buildCommunityReport(context({ reading: stationReading('moderate'), grap: null }));
    const ids = report.actions.map((action) => action.id);
    expect(ids).toEqual([
      'health-advice',
      'outdoor-move',
      'outdoor-light',
      'wet-mopping',
      'no-idling',
      'stop-waste-burning',
      'generator-essential',
    ]);
    const move = report.wording.en.actions.find((line) => line.id === 'outdoor-move');
    expect(move?.text).toContain('move outdoor activity at 08:50 to the hours from 13:00 to 16:00');
    expect(report.facts.find((fact) => fact.unit === 'outdoor periods')?.value).toBe(1);
  });

  it('asks for a fresh check and adds no restriction when no reading is available', () => {
    const report = buildCommunityReport(context({ reading: UNAVAILABLE, grap: null }));
    expect(report.actions.map((action) => action.id)).toEqual(['check-reading', 'stop-waste-burning']);
    expect(report.dayKind).toBe('unknown');
    expect(report.notice.en.lines[0]).toBe('Dear parents and staff, no air reading is available right now.');
  });

  it('labels a modelled reading as an estimate and a blank CPCB AQI in words', () => {
    const modelled = buildCommunityReport(context({ reading: modelledReading('poor') }));
    expect(modelled.notice.en.lines[0]).toContain('is not a measurement');
    expect(modelled.notice.hi?.lines[0]).toContain('असली माप नहीं');
    const blank = buildCommunityReport(context({ reading: stationReading(null) }));
    expect(blank.notice.en.lines[0]).toContain('CPCB published no AQI for the nearest station');
    expect(blank.band).toBeNull();
  });

  it('calls the reading the latest one with its hour, and asks for a morning check after a night reading', () => {
    const day = buildCommunityReport(context({ reading: stationReading('poor') }));
    expect(day.notice.en.lines[0]).toContain('the latest CPCB reading, for 06:00, is Poor');
    expect(day.notice.en.lines[0]).not.toContain('check the AQI again in the morning');
    const night = { ...stationReading('poor'), readingHour: '2026-11-26T04:00:00+05:30' };
    const early = buildCommunityReport(context({ reading: night }));
    expect(early.notice.en.lines[0]).toContain('check the AQI again in the morning before outdoor activity');
    expect(early.notice.hi?.lines[0]).toContain('सुबह बाहर की गतिविधि से पहले AQI दोबारा देखें');
    expect(early.notice.hi?.lines[0]).toContain('04:00 बजे की ताजा रीडिंग');
    const estimate = modelledReading('poor');
    const nightly =
      estimate.path === 'modelled' ? { ...estimate, modelHour: '2026-11-26T03:00:00+05:30' } : estimate;
    const modelled = buildCommunityReport(context({ reading: nightly }));
    expect(modelled.notice.en.lines[0]).toContain('check the AQI again in the morning');
    const none = buildCommunityReport(
      context({ reading: { path: 'unavailable', reason: 'feed_and_model_down' } }),
    );
    expect(none.notice.en.lines[0]).not.toContain('in the morning');
  });

  it('says when the reading is stale', () => {
    const report = buildCommunityReport(context({ reading: stationReading('poor', 'Okhla, Delhi', true) }));
    expect(report.notice.en.lines[0]).toContain('This reading is more than three hours old.');
    expect(report.notice.hi?.lines[0]).toContain('तीन घंटे से ज्यादा पुरानी');
  });

  it('shows no generator step or figure for a gas generator, since no cited figure covers it', () => {
    const generator: CommunityInput['generator'] = { hoursPerDay: 4, kva: null, fuel: 'gas' };
    const community = { ...fullSociety(), generator };
    const report = buildCommunityReport(context({ community }));
    expect(report.actions.map((action) => action.id)).not.toContain('generator-essential');
    expect(report.facts.map((fact) => fact.unit)).not.toContain('hours a day');
  });

  it('adds the sports advisory for NCR schools only in November and December', () => {
    const march = Date.parse('2027-03-10T08:00:00+05:30');
    const report = buildCommunityReport(context({ now: march, grap: grapNotice('I') }));
    expect(report.actions.map((action) => action.id)).not.toContain('grap-sports');
    expect(report.notice.en.title).toBe('Air quality notice for parents and staff, 10 Mar 2027');
  });
});
