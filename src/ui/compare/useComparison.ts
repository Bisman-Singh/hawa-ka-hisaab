// The comparison's state: the sample picked, two plan requests to the server with the model on, or with the model off
// two plans made in this browser on the air it read, and how to run, pick and retry.
import { useState } from 'react';
import type { Location } from '../../features/air/types.js';
import { SAMPLE_HOUSEHOLDS } from '../../features/household/samples.js';
import type { Household } from '../../features/household/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import { useAir } from '../data/api.js';
import { usePlan } from '../data/plan-api.js';
import type { RequestState } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { calling } from '../handlers.js';
import { localPlan } from '../plan/local.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { COMPARE } from './words.js';

/** Both plans of a comparison. */
export interface Pair {
  readonly mine: PlanResponse;
  readonly theirs: PlanResponse;
}

/** One way of making both plans: where it stands, how to run it for a sample household, reset it and retry. */
interface Side {
  readonly pair: Pair | null;
  readonly states: readonly RequestState<unknown>[];
  readonly run: (other: Household) => void;
  readonly reset: () => void;
  readonly retry: () => void;
}

function useServedPair(household: Household, location: Location): Side {
  const announce = useAnnounce();
  const left = usePlan();
  const right = usePlan(calling(announce, COMPARE.ready));
  const run = (other: Household): void => {
    left.run({ household, location, language: 'en' });
    right.run({ household: other, location, language: 'en' });
  };
  const pair =
    left.state.status === 'done' && right.state.status === 'done'
      ? { mine: left.state.data, theirs: right.state.data }
      : null;
  const reset = (): void => {
    left.reset();
    right.reset();
  };
  return { pair, states: [left.state, right.state], run, reset, retry: right.retry };
}

/** With the model off, both plans are made here on the air this page read; the air is read first when needed. */
function useLocalPair(household: Household, location: Location, local: boolean): Side {
  const { reading } = useAppState();
  const { setReading } = useAppActions();
  const announce = useAnnounce();
  const air = useAir(local && reading === null ? location : null, setReading);
  const [pair, setPair] = useState<Pair | null>(null);
  const run = (other: Household): void => {
    if (reading !== null) {
      const now = Date.now();
      const plan = (made: Household): PlanResponse =>
        localPlan({ household: made, language: 'en' }, reading, now);
      setPair({ mine: plan(household), theirs: plan(other) });
      announce(COMPARE.ready);
    }
  };
  const reset = (): void => {
    setPair(null);
  };
  return { pair, states: [air.state], run, reset, retry: air.retry };
}

/** What the comparison view shows: the sample picked, both plans once made, where they stand, and the actions. */
export interface Comparing {
  readonly picked: number;
  readonly pick: (value: string) => void;
  readonly run: () => void;
  readonly sample: typeof SAMPLE_HOUSEHOLDS;
  readonly done: Pair | null;
  readonly states: readonly RequestState<unknown>[];
  readonly retry: () => void;
}

/** The comparison: from the server with the model on, or made in this browser with it off. */
export function useComparison(household: Household, location: Location, local: boolean): Comparing {
  const [picked, setPicked] = useState(0);
  const served = useServedPair(household, location);
  const here = useLocalPair(household, location, local);
  const side = local ? here : served;
  const sample = SAMPLE_HOUSEHOLDS.slice(picked, picked + 1);
  const run = (): void => {
    sample.forEach((other) => {
      side.run(other.household);
    });
  };
  const pick = (value: string): void => {
    setPicked(Number(value));
    served.reset();
    here.reset();
  };
  return { picked, pick, run, sample, done: side.pair, states: side.states, retry: local ? here.retry : run };
}
