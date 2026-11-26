// The plan for the saved household and place: asks for the air when it is not held yet, asks for the plan when
// there is none, keeps both in the shared state and says which state the screens should show.
import { useCallback } from 'react';
import type { AirResponse, Location } from '../../features/air/types.js';
import type { Household } from '../../features/household/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import type { ApiCallFailure } from '../api-client.js';
import { useAir } from '../data/api.js';
import { useQuery } from '../data/request.js';
import type { RequestState } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { planCall } from './calls.js';
import { PLAN } from './strings.js';

/** What the plan screens can show. again asks the model afresh, for the model-down state. */
export type DayPlan =
  | { readonly status: 'no_place' }
  | { readonly status: 'no_household' }
  | { readonly status: 'loading'; readonly air: AirResponse | null }
  | { readonly status: 'failed'; readonly failure: ApiCallFailure; readonly retry: () => void }
  | {
      readonly status: 'ready';
      readonly response: PlanResponse;
      readonly household: Household;
      readonly location: Location;
      readonly air: AirResponse | null;
      readonly again: () => void;
    };

interface Saved {
  readonly household: Household | null;
  readonly location: Location | null;
  readonly plan: PlanResponse | null;
  readonly reading: AirResponse | null;
}

interface Asks {
  readonly retry: () => void;
  readonly again: () => void;
}

/** The state to show for what is saved and where the plan request stands. */
export function dayPlanOf(saved: Saved, request: RequestState<PlanResponse>, asks: Asks): DayPlan {
  const { household, location, plan, reading } = saved;
  if (location === null) {
    return { status: 'no_place' };
  }
  if (household === null) {
    return { status: 'no_household' };
  }
  if (plan !== null) {
    return { status: 'ready', response: plan, household, location, air: reading, again: asks.again };
  }
  return request.status === 'failed'
    ? { status: 'failed', failure: request.failure, retry: asks.retry }
    : { status: 'loading', air: reading };
}

/** The day plan for the saved household, place and language, made once and kept until one of them changes. */
export function useDayPlan(): DayPlan {
  const { household, location, language, reading, plan } = useAppState();
  const { setReading, setPlan } = useAppActions();
  const announce = useAnnounce();
  useAir(reading === null ? location : null, setReading);
  const keep = useCallback(
    (response: PlanResponse) => {
      setPlan(response);
      announce(PLAN.ready);
    },
    [setPlan, announce],
  );
  const request = household === null || location === null ? null : { household, location, language };
  const { state, retry } = useQuery(planCall, plan === null ? request : null, keep);
  const again = useCallback(() => {
    setPlan(null);
    retry();
  }, [setPlan, retry]);
  return dayPlanOf({ household, location, plan, reading }, state, { retry, again });
}
