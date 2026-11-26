// The day plan view: each state it can be in, and the plan itself with the forecast, the three slots, the
// reckoning and the ask box, beside a short account of the household and links to the other views.
import { useId } from 'react';
import type { ReactElement } from 'react';
import type { Household } from '../../features/household/types.js';
import { activityName, capitalise } from '../../features/planner/text.js';
import { describeMember } from '../../features/household/members.js';
import { AskBox } from '../ask/AskBox.js';
import { ViewLink } from '../components/Navigation.js';
import { useOnline } from '../hooks/useOnline.js';
import { ForecastStrip } from './ForecastStrip.js';
import { PlanHead } from './PlanHead.js';
import { Bulletin, ModelNote } from './PlanNotes.js';
import { PlanSlots, Reckoning } from './PlanSlots.js';
import { NotReady } from './states.js';
import { PLAN } from './strings.js';
import { useDayPlan } from './useDayPlan.js';
import type { DayPlan } from './useDayPlan.js';

const LINKS: readonly (keyof typeof PLAN.links)[] = ['indoor', 'compare', 'community'];

/** The left page: the people and outings the plan is for, and the other views of this account. */
export function Account({ household }: { readonly household: Household }): ReactElement {
  const id = useId();
  return (
    <aside className="page-left" aria-labelledby={id}>
      <h2 id={id} className="vh">
        {PLAN.aside}
      </h2>
      <section className="sec" aria-label={PLAN.household}>
        <h2>{PLAN.household}</h2>
        <ul className="abstract">
          <li>
            <b>{PLAN.people}</b>
            <span>{household.members.map(describeMember).join('; ')}</span>
          </li>
          <li>
            <b>{PLAN.outings}</b>
            <span>
              {household.activities.map((a) => `${capitalise(activityName(a))} ${a.start}`).join('; ')}
            </span>
          </li>
        </ul>
        <ViewLink to="household">{PLAN.changeHousehold}</ViewLink>
      </section>
      <nav className="sec" aria-label={PLAN.more}>
        <h2>{PLAN.more}</h2>
        <ul className="abstract">
          {LINKS.map((view) => (
            <li key={view}>
              <ViewLink to={view}>{PLAN.links[view]}</ViewLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function PlanReady({ day }: { readonly day: Extract<DayPlan, { status: 'ready' }> }): ReactElement {
  const online = useOnline();
  const { plan, airBasis } = day.response;
  const curve = day.air?.forecast ?? null;
  return (
    <div className="spread">
      <div className="page-right">
        {plan.dayKind === 'severe' && plan.band !== null ? (
          <Bulletin band={plan.band} basis={airBasis} air={day.air} />
        ) : null}
        <PlanHead response={day.response} air={day.air} household={day.household} />
        <ModelNote response={day.response} again={day.again} />
        {online ? null : <p className="small">{PLAN.offline}</p>}
        <ForecastStrip plan={plan} basis={airBasis} curve={curve} />
        <PlanSlots plan={plan} household={day.household} curve={curve} />
        <Reckoning plan={plan} household={day.household} />
        <AskBox household={day.household} location={day.location} language={plan.language} />
      </div>
      <Account household={day.household} />
    </div>
  );
}

/** The plan view, in whichever state it is in. */
export function PlanView(): ReactElement {
  const day = useDayPlan();
  return day.status === 'ready' ? <PlanReady day={day} /> : <NotReady day={day} title={PLAN.title} />;
}
