// Tests for the air summary sent to the model: the band, the AQI, distance and hour, and a fact for every number.
import { describe, expect, it } from 'vitest';
import { airFacts, readingBand } from '../../../src/features/air/reading-facts.js';
import type { ModelledReading } from '../../../src/features/air/types.js';
import { modelledReading, stationReading } from '../community/support.js';

function modelled(): ModelledReading {
  const reading = modelledReading('moderate');
  if (reading.path !== 'modelled') {
    throw new Error('expected a modelled reading');
  }
  return reading;
}

describe('readingBand', () => {
  it('gives the published band, the computed estimate band, or null', () => {
    expect(readingBand(stationReading('severe'))).toBe('severe');
    expect(readingBand(stationReading(null))).toBeNull();
    expect(readingBand(modelledReading('moderate'))).toBe('moderate');
    const insufficient: ModelledReading = {
      ...modelled(),
      estimate: { status: 'insufficient', reason: 'no_particulate', available: [] },
    };
    expect(readingBand(insufficient)).toBeNull();
    expect(readingBand({ path: 'unavailable', reason: 'feed_and_model_down' })).toBeNull();
  });
});

describe('airFacts', () => {
  it('summarises a station reading and gives a fact for the AQI, the hour, the distance and name digits', () => {
    const { summary, facts } = airFacts(stationReading('severe', 'Sector 62, Noida - IMD'));
    expect(summary).toEqual({
      path: 'station',
      band: 'severe',
      aqi: 433,
      station: 'Sector 62, Noida - IMD',
      distanceKm: 3.4,
      time: '06:00',
      stale: false,
    });
    expect(facts.map((fact) => [fact.id, fact.value])).toEqual([
      ['air-aqi', 433],
      ['air-reading-time', 6],
      ['air-reading-time', 0],
      ['air-station-distance', 3.4],
      ['air-station-name', 62],
    ]);
  });

  it('labels a modelled estimate as such and says the distance is to the nearest station', () => {
    const { summary, facts } = airFacts(modelledReading('moderate'));
    expect(summary).toMatchObject({ path: 'modelled', station: null, stale: false });
    expect(facts.find((fact) => fact.id === 'air-aqi')?.label).toBe('Modelled AQI estimate');
    expect(facts.find((fact) => fact.id === 'air-station-distance')).toMatchObject({
      label: 'Distance to the nearest station',
      value: 84,
    });
    const insufficient = airFacts({
      ...modelled(),
      estimate: { status: 'insufficient', reason: 'too_few_pollutants', available: ['pm25'] },
    });
    expect(insufficient.summary.aqi).toBeNull();
    expect(insufficient.facts.map((fact) => fact.id)).not.toContain('air-aqi');
    const far = airFacts({ ...modelled(), nearestStationKm: null });
    expect(far.facts.map((fact) => fact.id)).not.toContain('air-station-distance');
  });

  it('sends no number at all when neither source answered, or when a station has no AQI', () => {
    expect(airFacts({ path: 'unavailable', reason: 'feed_and_model_down' })).toEqual({
      summary: {
        path: 'unavailable',
        band: null,
        aqi: null,
        station: null,
        distanceKm: null,
        time: null,
        stale: false,
      },
      facts: [],
    });
    expect(airFacts(stationReading(null, 'Mandir Marg')).facts.map((fact) => fact.id)).not.toContain(
      'air-aqi',
    );
  });
});
