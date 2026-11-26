// Tests for device location: never asked before the press, rounded before use, and each refusal named.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDeviceLocation } from '../../../src/ui/place/useDeviceLocation.js';

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

function stubGeolocation(answer: (ok: Success, fail: Failure) => void) {
  const getCurrentPosition = vi.fn<(ok: Success, fail: Failure) => void>(answer);
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

const at = (latitude: number, longitude: number): GeolocationPosition => ({
  coords: {
    latitude,
    longitude,
    accuracy: 20,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 0,
  toJSON: () => ({}),
});

const refused = (code: number): GeolocationPositionError => ({
  code,
  message: '',
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
});

describe('useDeviceLocation', () => {
  it('asks only when locate is called, and rounds the point to two decimals before passing it on', () => {
    let answer: Success = () => undefined;
    const ask = stubGeolocation((ok) => {
      answer = ok;
    });
    const onFound = vi.fn();
    const { result } = renderHook(() => useDeviceLocation(onFound));
    expect(ask).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
    act(() => {
      result.current.locate();
    });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('asking');
    act(() => {
      answer(at(28.654321, 77.314159));
    });
    expect(onFound).toHaveBeenCalledWith({ lat: 28.65, lon: 77.31 });
    expect(result.current.state).toBe('idle');
  });

  it('names a point outside India and passes nothing on', () => {
    stubGeolocation((ok) => {
      ok(at(51.5, -0.12));
    });
    const onFound = vi.fn();
    const { result } = renderHook(() => useDeviceLocation(onFound));
    act(() => {
      result.current.locate();
    });
    expect(result.current.state).toBe('outside');
    expect(onFound).not.toHaveBeenCalled();
  });

  it('tells a refusal from a failure, and a browser without location from both', () => {
    stubGeolocation((_ok, fail) => {
      fail(refused(1));
    });
    const denied = renderHook(() => useDeviceLocation(vi.fn())).result;
    act(() => {
      denied.current.locate();
    });
    expect(denied.current.state).toBe('denied');
    stubGeolocation((_ok, fail) => {
      fail(refused(3));
    });
    const lost = renderHook(() => useDeviceLocation(vi.fn())).result;
    act(() => {
      lost.current.locate();
    });
    expect(lost.current.state).toBe('unavailable');
    vi.stubGlobal('navigator', {});
    const none = renderHook(() => useDeviceLocation(vi.fn())).result;
    act(() => {
      none.current.locate();
    });
    expect(none.current.state).toBe('unavailable');
  });
});
