// One way for views to call the API: loading, failure, retry and abort are handled here, once.
// A newer request or leaving the view aborts the older one, and an aborted answer is never shown.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result } from '../../lib/result.js';
import type { ApiCallFailure } from '../api-client.js';

/** Where a request stands. idle means nothing has been asked yet. */
export type RequestState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'done'; readonly data: T }
  | { readonly status: 'failed'; readonly failure: ApiCallFailure };

/** A call the hooks can make: input in, a result out, stopped by the signal. */
export type Call<I, T> = (input: I, signal: AbortSignal) => Promise<Result<T, ApiCallFailure>>;

/** Called with the data when a request succeeds, for example to keep a reading in the shared state. */
export type OnDone<T> = (data: T) => void;

/** A request that runs by itself. retry asks again with the same input. */
export interface Query<T> {
  readonly state: RequestState<T>;
  readonly retry: () => void;
}

/** A request run on demand, such as a form send. run replaces any request still in flight; reset forgets it. */
export interface Action<I, T> extends Query<T> {
  readonly run: (input: I) => void;
  readonly reset: () => void;
}

interface Job<I> {
  readonly input: I;
  readonly key: string;
}

const IDLE = { status: 'idle' } satisfies RequestState<never>;
const LOADING = { status: 'loading' } satisfies RequestState<never>;

const toState = <T>(result: Result<T, ApiCallFailure>): RequestState<T> =>
  result.ok ? { status: 'done', data: result.value } : { status: 'failed', failure: result.error };

type Settle<T> = (key: string, result: Result<T, ApiCallFailure>) => void;

function start<I, T>(call: Call<I, T>, job: Job<I>, settle: Settle<T>): () => void {
  const controller = new AbortController();
  void call(job.input, controller.signal).then((result) => {
    if (!controller.signal.aborted) {
      settle(job.key, result);
    }
  });
  return () => {
    controller.abort();
  };
}

function useJob<I, T>(call: Call<I, T>, job: Job<I> | null, onDone?: OnDone<T>): RequestState<T> {
  const [settled, setSettled] = useState<{ readonly key: string; readonly state: RequestState<T> } | null>(
    null,
  );
  const latest = useRef({ job, onDone });
  useEffect(() => {
    latest.current = { job, onDone };
  });
  const key = job?.key ?? null;
  useEffect(() => {
    const current = latest.current.job;
    if (current === null) {
      return undefined;
    }
    return start(call, current, (doneKey, result) => {
      setSettled({ key: doneKey, state: toState(result) });
      if (result.ok) {
        latest.current.onDone?.(result.value);
      }
    });
  }, [key, call]);
  if (job === null) {
    return IDLE;
  }
  return settled?.key === job.key ? settled.state : LOADING;
}

/** Runs the call whenever the input changes, and not while it is null. Inputs are compared by their JSON. */
export function useQuery<I, T>(call: Call<I, T>, input: I | null, onDone?: OnDone<T>): Query<T> {
  const [attempt, setAttempt] = useState(0);
  const job = input === null ? null : { input, key: `${JSON.stringify(input)}#${String(attempt)}` };
  const state = useJob(call, job, onDone);
  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);
  return { state, retry };
}

/** Runs the call when run(input) is called, usually from a submit or click handler. */
export function useAction<I, T>(call: Call<I, T>, onDone?: OnDone<T>): Action<I, T> {
  const [job, setJob] = useState<Job<I> | null>(null);
  const count = useRef(0);
  const state = useJob(call, job, onDone);
  const run = useCallback((input: I) => {
    count.current += 1;
    setJob({ input, key: String(count.current) });
  }, []);
  const retry = useCallback(() => {
    count.current += 1;
    setJob((current) => (current === null ? null : { input: current.input, key: String(count.current) }));
  }, []);
  const reset = useCallback(() => {
    setJob(null);
  }, []);
  return { state, run, retry, reset };
}
