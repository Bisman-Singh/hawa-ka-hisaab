// The states a plan screen shows before its plan is ready: no place or household yet, the model choice not made
// yet, loading with its steps and skeleton entries, or a failed request with a retry.
import type { ReactElement } from 'react';
import { ViewHeading, ViewLink } from '../components/Navigation.js';
import { type ProgressStep, ProgressSteps, Skeleton } from '../components/Progress.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { StateMessage } from '../components/StateMessage.js';
import { ModelChoice } from '../consent/ModelChoice.js';
import { CONSENT } from '../consent/words.js';
import { PLAN } from './words.js';
import type { DayPlan } from './useDayPlan.js';

/** A view that cannot show its content yet, with a link to the earlier view that fixes it. */
export function Missing({
  title,
  what,
}: {
  readonly title: string;
  readonly what: 'no_place' | 'no_household';
}): ReactElement {
  const text = what === 'no_place' ? PLAN.noPlace : PLAN.noHousehold;
  return (
    <div className="page-right">
      <ViewHeading>{title}</ViewHeading>
      <StateMessage tone="status" glyph="start" title={text.title} quiet level={2}>
        <p>{text.body}</p>
        <ViewLink to={what === 'no_place' ? 'home' : 'household'}>{text.link}</ViewLink>
      </StateMessage>
    </div>
  );
}

/** The waiting state: which steps have started, and skeleton entries in the shape of the plan. */
export function PlanLoading({
  airDone,
  title,
}: {
  readonly airDone: boolean;
  readonly title: string;
}): ReactElement {
  const steps: ProgressStep[] = [{ label: PLAN.loadingSteps.air, state: airDone ? 'done' : 'now' }];
  return (
    <div className="page-right" aria-busy="true">
      <header className="plan-head">
        <ViewHeading>{title}</ViewHeading>
        <p className="status" role="status">
          {PLAN.busy}
        </p>
      </header>
      <ProgressSteps steps={airDone ? [...steps, { label: PLAN.loadingSteps.plan, state: 'now' }] : steps} />
      <ol className="ledger" aria-hidden="true">
        {['w45', 'w30'].map((size) => (
          <li key={size} className="entry">
            <div className="when">
              <Skeleton size="w80" />
            </div>
            <div className="what">
              <Skeleton size={size === 'w45' ? 'w45' : 'w30'} tall />
              <Skeleton size="w80" />
              <Skeleton size="w60" />
            </div>
          </li>
        ))}
      </ol>
      <p className="small">{PLAN.loadingNote}</p>
    </div>
  );
}

/** Every state but ready: no place or household yet, loading, or a failed request with a retry. */
export function NotReady({
  day,
  title,
}: {
  readonly day: Exclude<DayPlan, { status: 'ready' }>;
  readonly title: string;
}): ReactElement {
  if (day.status === 'no_place' || day.status === 'no_household') {
    return <Missing title={title} what={day.status} />;
  }
  if (day.status === 'loading') {
    return <PlanLoading airDone={day.air !== null} title={title} />;
  }
  if (day.status === 'choose') {
    return (
      <div className="page-right">
        <ViewHeading>{title}</ViewHeading>
        <ModelChoice without={CONSENT.offPlan} />
      </div>
    );
  }
  return (
    <div className="page-right">
      <ViewHeading>{title}</ViewHeading>
      <RequestFailure failure={day.failure} retry={day.retry} level={2} />
    </div>
  );
}
