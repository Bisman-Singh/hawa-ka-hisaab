// Compare: the person's own household against a sample household in the same air. Two plan requests for the same
// place, or with the model off two plans made in this browser on the air it read, then the planner's comparePlans.
import { Button } from '../components/Button.js';
import type { ReactElement } from 'react';
import type { Location } from '../../features/air/types.js';
import { SAMPLE_HOUSEHOLDS } from '../../features/household/samples.js';
import type { Household } from '../../features/household/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import { Field } from '../components/Field.js';
import { ViewHeading } from '../components/Navigation.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { ModelChoice } from '../consent/ModelChoice.js';
import { CONSENT } from '../consent/words.js';
import type { RequestState } from '../data/request.js';
import { useAppState } from '../state/app-state.js';
import { useComparison } from './useComparison.js';
import { Missing } from '../plan/states.js';
import { CompareResult } from './CompareResult.js';
import { COMPARE } from './words.js';
import { texting } from '../handlers.js';

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

function Comparison({
  household,
  location,
  local,
}: {
  readonly household: Household;
  readonly location: Location;
  readonly local: boolean;
}): ReactElement {
  const { picked, pick, run, sample, done, states, retry } = useComparison(household, location, local);
  const failed = states.find((state): state is Failed => state.status === 'failed');
  const busy = states.some((state) => state.status === 'loading');
  return (
    <>
      <SamplePicker picked={picked} onPick={pick} />
      <Button look="main" onClick={run} disabled={busy}>
        {COMPARE.run}
      </Button>
      {busy ? (
        <p className="status" role="status">
          {COMPARE.busy}
        </p>
      ) : null}
      {failed === undefined ? null : <RequestFailure failure={failed.failure} retry={retry} />}
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

/** The compare view. It needs a place, the person's own household and the model choice first. */
export function CompareView(): ReactElement {
  const { household, location, modelChoice } = useAppState();
  if (location === null || household === null) {
    return <Missing title={COMPARE.title} what={location === null ? 'no_place' : 'no_household'} />;
  }
  return (
    <div>
      <ViewHeading>{COMPARE.title}</ViewHeading>
      <p className="lede">{COMPARE.lede}</p>
      {modelChoice === null ? (
        <ModelChoice without={CONSENT.offCompare} />
      ) : (
        <Comparison household={household} location={location} local={modelChoice === 'off'} />
      )}
    </div>
  );
}
