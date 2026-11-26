// Device location on request only: the browser is asked when the person presses the button, never before, and
// the point is rounded to about a kilometre before anything else sees it. Each refusal has its own state.
import { useCallback, useState } from 'react';
import { locationSchema } from '../../features/air/schemas.js';
import type { Location } from '../../features/air/types.js';
import { roundCoordinate } from '../data/api.js';

/** Where a location request stands. outside means the browser gave a point outside India. */
export type LocateState = 'idle' | 'asking' | 'denied' | 'unavailable' | 'outside';

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 };

/** The request state and locate(), which asks the browser once. onFound gets the rounded point in India. */
export function useDeviceLocation(onFound: (location: Location) => void): {
  readonly state: LocateState;
  readonly locate: () => void;
} {
  const [state, setState] = useState<LocateState>('idle');
  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unavailable');
      return;
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = locationSchema.safeParse({
          lat: roundCoordinate(coords.latitude),
          lon: roundCoordinate(coords.longitude),
        });
        setState(point.success ? 'idle' : 'outside');
        if (point.success) {
          onFound(point.data);
        }
      },
      (error) => {
        setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      OPTIONS,
    );
  }, [onFound]);
  return { state, locate };
}
