// Tests for the in-memory intake store: kept, marked used, forgotten, and followed by components.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IntakeResponse } from '../../../src/features/household/types.js';
import {
  markIntakeUsed,
  readIntake,
  setIntake,
  useIntakeEntry,
} from '../../../src/ui/household/intake-store.js';
import { sampleTrace } from '../../support/samples.js';

const response: IntakeResponse = { outcome: 'unavailable', reason: 'quota', trace: sampleTrace() };

describe('intake store', () => {
  it('keeps the last reading in memory, marks it used and forgets it', () => {
    setIntake(null);
    markIntakeUsed();
    expect(readIntake()).toBeNull();
    const { result } = renderHook(() => useIntakeEntry());
    act(() => {
      setIntake({ text: 'Two adults.', response });
    });
    expect(result.current).toEqual({ text: 'Two adults.', response, used: false });
    act(() => {
      markIntakeUsed();
    });
    expect(result.current?.used).toBe(true);
    act(() => {
      setIntake(null);
    });
    expect(result.current).toBeNull();
  });

  it('never writes the text to storage', () => {
    window.localStorage.clear();
    setIntake({ text: 'Private words.', response });
    const kept = Object.keys(window.localStorage).map((key) => window.localStorage.getItem(key));
    expect(JSON.stringify(kept)).not.toContain('Private words.');
    expect(window.sessionStorage.length).toBe(0);
  });
});
