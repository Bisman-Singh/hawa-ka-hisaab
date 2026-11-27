// The air for the plan screens as one request, whether the page already holds the reading or still has to read it,
// so the air card beside the plan can show every state and retry.
import { useMemo } from 'react';
import type { AirResponse, Location } from '../../features/air/types.js';
import { useAir } from '../data/api.js';
import type { Query } from '../data/request.js';
import { useAppActions, useAppState } from '../state/app-state.js';

/**
 * The air for a location as a request: the reading held in the shared state when there is one, otherwise a fresh
 * read that is kept there. retry drops the held reading and reads again.
 */
export function useAirQuery(location: Location | null): {
  readonly reading: AirResponse | null;
  readonly air: Query<AirResponse>;
} {
  const { reading } = useAppState();
  const { setReading } = useAppActions();
  const { state, retry } = useAir(reading === null ? location : null, setReading);
  const air = useMemo(
    (): Query<AirResponse> => ({
      state: reading === null ? state : { status: 'done', data: reading },
      retry: () => {
        setReading(null);
        retry();
      },
    }),
    [reading, state, retry, setReading],
  );
  return { reading, air };
}
