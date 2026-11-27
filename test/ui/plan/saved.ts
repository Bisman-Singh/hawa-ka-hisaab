// What the earlier views would have kept in the browser: a household, a place and the model choice.
import { saveState } from '../../../src/ui/storage.js';
import type { ModelChoiceValue } from '../../../src/ui/storage.js';
import { sample } from '../../support/plan-fixtures.js';

const DELHI = { lat: 28.54, lon: 77.17 };

/** Saves a household and place in local storage, as the earlier views would, with the model on unless told. */
export function saveSample(
  id = 'family-car-asthma',
  language: 'en' | 'hi' = 'en',
  modelChoice: ModelChoiceValue = 'on',
): void {
  saveState(window.localStorage, {
    version: 1,
    household: sample(id),
    location: DELHI,
    place: {
      id: 'p1',
      name: 'Delhi',
      district: null,
      state: 'Delhi',
      postcode: null,
      lat: 28.54,
      lon: 77.17,
    },
    language,
    modelChoice,
  });
}

/** Saves only a place, with no household yet. */
export function savePlaceOnly(): void {
  saveState(window.localStorage, {
    version: 1,
    household: null,
    location: DELHI,
    place: null,
    language: 'en',
    modelChoice: null,
  });
}
