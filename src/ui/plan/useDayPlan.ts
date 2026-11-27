// The plan for the saved household and place: the air first, then the model choice, then the plan from the server
// with the model on or made in this browser with it off, kept in the shared state, with the state to show.
import { useCallback, useMemo, useState } from 'react';
import type { AirResponse, Location } from '../../features/air/types.js';
import type { Household } from '../../features/household/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import type { ApiCallFailure } from '../api-client.js';
import { usePlanFor } from '../data/plan-api.js';
import type { Query, RequestState } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import type { ModelChoiceValue } from '../storage.js';
import { localPlan } from './local.js';
import { useAirQuery } from './useAirQuery.js';
import { PLAN } from './strings.js';

/** What the plan screens can show. again asks the model afresh; local marks a plan made in this browser. */
export type DayPlan =
  | { readonly status: 'no_place' }
  | { readonly status: 'no_household' }
  | { readonly status: 'choose' }
  | { readonly status: 'loading'; readonly air: AirResponse | null }
  | { readonly status: 'failed'; readonly failure: ApiCallFailure; readonly retry: () => void }
  | {
      readonly status: 'ready';
      readonly response: PlanResponse;
      readonly household: Household;
      readonly location: Location;
      readonly air: AirResponse | null;
      readonly airQuery: Query<AirResponse>;
      readonly again: () => void;
      readonly local: boolean;
    };

interface Saved {
  readonly household: Household | null;
  readonly location: Location | null;
  readonly plan: PlanResponse | null;
  readonly reading: AirResponse | null;
  readonly choice: ModelChoiceValue;
}

interface Asks {
  readonly retry: () => void;
  readonly again: () => void;
  readonly air: Query<AirResponse>;
}

function waiting(request: RequestState<unknown>, asks: Asks, reading: AirResponse | null): DayPlan {
  return request.status === 'failed'
    ? { status: 'failed', failure: request.failure, retry: asks.retry }
    : { status: 'loading', air: reading };
}

/** The state to show for what is saved, the model choice and where the plan or, with the model off, the air stands. */
export function dayPlanOf(saved: Saved, request: RequestState<PlanResponse>, asks: Asks): DayPlan {
  const { household, location, plan, reading, choice } = saved;
  if (location === null) {
    return { status: 'no_place' };
  }
  if (household === null) {
    return { status: 'no_household' };
  }
  if (choice === null) {
    return { status: 'choose' };
  }
  const local = choice === 'off';
  if (plan !== null) {
    const ready = {
      response: plan,
      household,
      location,
      air: reading,
      airQuery: asks.air,
      again: asks.again,
    };
    return { status: 'ready', ...ready, local };
  }
  return local
    ? waiting(asks.air.state, { ...asks, retry: asks.air.retry }, reading)
    : waiting(request, asks, reading);
}

/** The day plan for the saved household, place, language and model choice, made once and kept until one changes. */
export function useDayPlan(): DayPlan {
  const { household, location, language, plan, modelChoice } = useAppState();
  const { setPlan } = useAppActions();
  const announce = useAnnounce();
  const { reading, air } = useAirQuery(location);
  const [now] = useState(() => Date.now());
  const keep = useCallback(
    (response: PlanResponse) => {
      setPlan(response);
      announce(PLAN.ready);
    },
    [setPlan, announce],
  );
  const ask = household !== null && location !== null && modelChoice === 'on' && plan === null;
  const { state, retry } = usePlanFor(ask ? { household, location, language } : null, keep);
  const made = useMemo(
    () =>
      modelChoice === 'off' && household !== null && reading !== null
        ? localPlan({ household, language }, reading, now)
        : null,
    [modelChoice, household, language, reading, now],
  );
  const again = useCallback(() => {
    setPlan(null);
    retry();
  }, [setPlan, retry]);
  const saved = { household, location, plan: made ?? plan, reading, choice: modelChoice };
  return dayPlanOf(saved, state, { retry, again, air });
}
