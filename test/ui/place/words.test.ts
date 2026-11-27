// Tests for the place and air card words that take values: a place not found, why the model is used, the radius.
import { describe, expect, it } from 'vitest';
import { fill } from '../../../src/lib/template.js';
import { AIR, GRAP_STAGES, modelledWhy, notFound, unavailableWhy } from '../../../src/ui/place/words.js';

describe('place and air words', () => {
  it('words a place not found differently for a PIN and a town', () => {
    expect(notFound('999999')).toEqual({
      error: 'No place found for PIN 999999.',
      hint: 'Check the six digits, or type the town.',
    });
    expect(notFound('Lukhnow')).toEqual({
      error: 'No place in India matches “Lukhnow”.',
      hint: 'Check the spelling, or try a PIN code.',
    });
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

  it('words each unavailable reason and GRAP stage, fills the timed messages and the radius', () => {
    expect(unavailableWhy('no_station_and_model_down')).toBe(
      'No CPCB station is within 50 km, and the model did not answer.',
    );
    expect(unavailableWhy('feed_and_model_down')).toContain('The CPCB feed and the model did not answer');
    expect(GRAP_STAGES.II).toBe('Stages I and II are in force');
    expect(fill(AIR.staleBody, { hour: '02:00 IST', age: '4 hours' })).toContain(
      'It is for 02:00 IST, 4 hours ago.',
    );
    expect(fill(AIR.downBody, { hour: '05:00 IST' })).toBe('Showing the last good reading, from 05:00 IST.');
    expect(fill(AIR.loading, { where: 'Lucknow' })).toBe('Reading the air for Lucknow');
    expect(AIR.start.body).toContain('If none is within 50 km, it shows a model estimate');
  });
});
