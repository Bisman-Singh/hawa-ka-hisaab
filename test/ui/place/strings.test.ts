// Tests for the place and air card words that take values.
import { describe, expect, it } from 'vitest';
import { AIR, GRAP_STAGES, modelledWhy, PLACE, UNAVAILABLE_WHY } from '../../../src/ui/place/strings.js';

describe('place and air words', () => {
  it('words a place not found differently for a PIN and a town', () => {
    expect(PLACE.notFound('999999')).toEqual([
      'No place found for PIN 999999.',
      'Check the six digits, or type the town.',
    ]);
    expect(PLACE.notFound('Lukhnow')).toEqual([
      'No place in India matches “Lukhnow”.',
      'Check the spelling, or try a PIN code.',
    ]);
  });

  it('says why the modelled path is used, with the nearest station when known', () => {
    expect(modelledWhy('no_station_in_range', 107.4)).toBe(
      'No CPCB station within 50 km. The nearest is 107 km away.',
    );
    expect(modelledWhy('no_station_in_range', null)).toBe('No CPCB station within 50 km.');
    expect(modelledWhy('no_station_reading', 12)).toBe(
      'No CPCB station within 50 km published a reading this hour.',
    );
    expect(modelledWhy('feed_unavailable', null)).toContain('The CPCB feed did not answer');
  });

  it('has words for each unavailable reason, GRAP stage and the timed messages', () => {
    expect(Object.keys(UNAVAILABLE_WHY)).toEqual(['feed_and_model_down', 'no_station_and_model_down']);
    expect(GRAP_STAGES.II).toBe('Stages I and II are in force');
    expect(AIR.staleBody('02:00 IST', '4 hours')).toContain('It is for 02:00 IST, 4 hours ago.');
    expect(AIR.downBody('05:00 IST')).toBe('Showing the last good reading, from 05:00 IST.');
    expect(AIR.loading('Lucknow')).toBe('Reading the air for Lucknow');
  });
});
