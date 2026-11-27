// Tests for the state kept in the browser between visits.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearState,
  EMPTY_STATE,
  loadState,
  saveState,
  STORAGE_KEY,
  type StoredState,
} from '../../src/ui/storage.js';
import { sampleHousehold } from '../support/samples.js';

const saved: StoredState = {
  version: 1,
  household: sampleHousehold(),
  location: { lat: 28.54, lon: 77.17 },
  place: null,
  language: 'hi',
  modelChoice: 'off',
};

afterEach(() => {
  localStorage.clear();
});

describe('loadState', () => {
  it('gives the empty state on a first visit', () => {
    expect(loadState(localStorage)).toEqual(EMPTY_STATE);
  });

  it('reads back what was saved', () => {
    expect(saveState(localStorage, saved)).toBe(true);
    expect(loadState(localStorage)).toEqual(saved);
  });

  it('keeps the household of a copy saved before the model choice existed, reading the choice as not made', () => {
    const { modelChoice, ...older } = saved;
    expect(modelChoice).toBe('off');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(older));
    expect(loadState(localStorage)).toEqual({ ...saved, modelChoice: null });
  });

  it('drops a damaged, outdated or invalid copy', () => {
    for (const raw of [
      '{not json',
      JSON.stringify({ ...saved, version: 0 }),
      JSON.stringify({ ...saved, name: 'x' }),
      JSON.stringify({ ...saved, modelChoice: 'maybe' }),
    ]) {
      localStorage.setItem(STORAGE_KEY, raw);
      expect(loadState(localStorage)).toEqual(EMPTY_STATE);
    }
  });

  it('gives the empty state when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(loadState(localStorage)).toEqual(EMPTY_STATE);
  });
});

describe('saveState and clearState', () => {
  it('reports when the browser refuses to save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveState(localStorage, saved)).toBe(false);
  });

  it('forgets the saved state', () => {
    saveState(localStorage, saved);
    expect(clearState(localStorage)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('reports when the browser refuses to forget', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(clearState(localStorage)).toBe(false);
  });
});
