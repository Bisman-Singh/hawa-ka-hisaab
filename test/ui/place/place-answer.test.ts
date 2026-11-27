// Tests for the words of a place answer: what was understood and how rough a PIN point is.
import { describe, expect, it } from 'vitest';
import { placeLabel, placeNote, placeWhere } from '../../../src/ui/place/place-answer.js';
import { pinPlace, townPlace } from './air-fixtures.js';

describe('placeLabel', () => {
  it('shows the label as understood, with a repeated part once', () => {
    expect(placeLabel(pinPlace())).toBe('PIN 110092, East Delhi, Delhi');
    expect(placeLabel(townPlace())).toBe('Lucknow, Uttar Pradesh');
  });

  it('builds a label for a place saved before labels existed', () => {
    const { label, resolution, roughness, ...old } = townPlace();
    expect([label, resolution, roughness]).toEqual(['Lucknow, Lucknow, Uttar Pradesh', 'search', null]);
    expect(placeLabel(old)).toBe('Lucknow, Uttar Pradesh');
    expect(placeLabel({ ...old, district: null, state: null })).toBe('Lucknow');
  });
});

describe('placeWhere', () => {
  it('names a found place as understood, and a device point as your location', () => {
    expect(placeWhere(pinPlace())).toBe('PIN 110092, East Delhi, Delhi');
    expect(placeWhere(null)).toBe('your location');
  });
});

describe('placeNote', () => {
  it('says a PIN is the approximate centre of its area, used only to find a station', () => {
    expect(placeNote(pinPlace())).toBe(
      'Approximate centre of the PIN area, used only to find the nearest monitoring station.',
    );
  });

  it('says how rough a prefix answer is and offers the town name as closer', () => {
    const prefix = pinPlace({
      resolution: 'pin_prefix',
      roughness: { prefix: '1109', pins: 7, spreadKm: 6.2 },
    });
    expect(placeNote(prefix)).toBe(
      'This PIN is not in the table, so this is the approximate centre of the 7 known PINs starting 1109, most within 6 km of it, used only to find the nearest monitoring station. Your town name gives a closer match.',
    );
    expect(placeNote(pinPlace({ resolution: 'pin_prefix', roughness: null }))).toBeNull();
  });

  it('adds nothing for a town found by search or a place with no resolution', () => {
    expect(placeNote(townPlace())).toBeNull();
    const { resolution, ...old } = townPlace();
    expect(resolution).toBe('search');
    expect(placeNote(old)).toBeNull();
  });
});
