// Compare: the person's own household against a sample household in the same air. Two plan requests for the same
// place, then the planner's comparePlans; each row is marked as differing or the same, with the reason.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Location } from '../../features/air/types.js';
import { SAMPLE_HOUSEHOLDS } from '../../features/household/samples.js';
import type { Household } from '../../features/household/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import { Field } from '../components/Field.js';
import { ViewHeading } from '../components/Navigation.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { useAction } from '../data/request.js';
import type { RequestState } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useAppState } from '../state/app-state.js';
import { planCall } from '../plan/calls.js';
import { Missing } from '../plan/states.js';
import { CompareResult } from './CompareResult.js';
import { COMPARE } from './strings.js';
import { calling, texting } from '../plan/handlers.js';

type Failed = Extract<RequestState<PlanResponse>, { status: 'failed' }>;

/** The choice of sample household to compare with. */
export function SamplePicker({
  picked,
  onPick,
}: {
  readonly picked: number;
  readonly onPick: (value: string) => void;
}): ReactElement {
  return (
    <Field label={COMPARE.pick} hint={COMPARE.pickHint}>
      {(control) => (
        <select {...control} value={picked} onChange={texting(onPick)}>
          {SAMPLE_HOUSEHOLDS.map((other, index) => (
            <option key={other.id} value={index}>
              {other.description}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function useComparison(household: Household, location: Location) {
  const [picked, setPicked] = useState(0);
  const announce = useAnnounce();
  const left = useAction(planCall);
  const right = useAction(planCall, calling(announce, COMPARE.ready));
  const sample = SAMPLE_HOUSEHOLDS.slice(picked, picked + 1);
  const run = (): void => {
    left.run({ household, location, language: 'en' });
    sample.forEach((other) => {
      right.run({ household: other.household, location, language: 'en' });
    });
  };
  const pick = (value: string): void => {
    setPicked(Number(value));
    left.reset();
    right.reset();
  };
  const done =
    left.state.status === 'done' && right.state.status === 'done'
      ? { mine: left.state.data, theirs: right.state.data }
      : null;
  const states = [left.state, right.state];
  return { picked, pick, run, sample, done, states };
}

function Comparison({
  household,
  location,
}: {
  readonly household: Household;
  readonly location: Location;
}): ReactElement {
  const { picked, pick, run, sample, done, states } = useComparison(household, location);
  const failed = states.find((state): state is Failed => state.status === 'failed');
  const busy = states.some((state) => state.status === 'loading');
  return (
    <>
      <SamplePicker picked={picked} onPick={pick} />
      <button className="btn" type="button" onClick={run} disabled={busy}>
        {COMPARE.run}
      </button>
      {busy ? (
        <p className="status" role="status">
          {COMPARE.busy}
        </p>
      ) : null}
      {failed === undefined ? null : <RequestFailure failure={failed.failure} retry={run} />}
      {done === null
        ? null
        : sample.map((other) => (
            <CompareResult
              key={other.id}
              again={run}
              mine={{ household, response: done.mine }}
              theirs={{ household: other.household, response: done.theirs, description: other.description }}
            />
          ))}
    </>
  );
}

/** The compare view. It needs a place and the person's own household first. */
export function CompareView(): ReactElement {
  const { household, location } = useAppState();
  if (location === null || household === null) {
    return <Missing title={COMPARE.title} what={location === null ? 'no_place' : 'no_household'} />;
  }
  return (
    <div>
      <ViewHeading>{COMPARE.title}</ViewHeading>
      <p className="lede">{COMPARE.lede}</p>
      <Comparison household={household} location={location} />
    </div>
  );
}
