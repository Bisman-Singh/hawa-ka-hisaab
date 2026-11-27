// The day plan view: each state it can be in, and the plan itself with the forecast, the three slots, the
// reckoning and the ask box, beside the air card, a short account of the household and links to the other views.
import { useId } from 'react';
import type { ReactElement } from 'react';
import type { AirResponse } from '../../features/air/types.js';
import type { Household } from '../../features/household/types.js';
import type { AirBasis } from '../../features/planner/types.js';
import { activityName, capitalise } from '../../features/planner/text.js';
import { AskBox, AskOff } from '../ask/AskBox.js';
import { ViewLink } from '../components/Navigation.js';
import type { Query } from '../data/request.js';
import { useOnline } from '../hooks/useOnline.js';
import { AirCardSlot } from '../place/AirCardSlot.js';
import { placeWhere } from '../place/place-answer.js';
import { useAppState } from '../state/app-state.js';
import { ForecastStrip } from './ForecastStrip.js';
import { PlanHead } from './PlanHead.js';
import { Bulletin, LocalNote, ModelNote } from './PlanNotes.js';
import { PlanSlots, Reckoning } from './PlanSlots.js';
import { otherAir } from './air-basis.js';
import { whatIfOf } from './plan-data.js';
import { peopleLine } from './plan-words.js';
import { NotReady } from './states.js';
import { PLAN } from './strings.js';
import { useDayPlan } from './useDayPlan.js';
import type { DayPlan } from './useDayPlan.js';

const LINKS: readonly (keyof typeof PLAN.links)[] = ['indoor', 'compare', 'community'];

/** Props of the left page: the household, the air request and the air basis of the plan. */
export interface AccountProps {
  readonly household: Household;
  readonly air: Query<AirResponse>;
  readonly basis: AirBasis;
}

/** The left page: the air card, the people and outings the plan is for, and the other views of this account. */
export function Account({ household, air, basis }: AccountProps): ReactElement {
  const id = useId();
  const { place } = useAppState();
  const held = air.state.status === 'done' ? air.state.data : null;
  return (
    <aside className="page-left" aria-labelledby={id}>
      <h2 id={id} className="vh">
        {PLAN.aside}
      </h2>
      <AirCardSlot air={air} where={placeWhere(place)} compact />
      {otherAir(held, basis) ? <p className="small">{PLAN.otherAir}</p> : null}
      <section className="sec" aria-label={PLAN.household}>
        <h2>{PLAN.household}</h2>
        <ul className="abstract">
          <li>
            <b>{PLAN.people}</b>
            <span>{peopleLine(household.members)}</span>
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
  const whatIf = whatIfOf(day.response);
  return (
    <div className="spread">
      <div className="page-right">
        {plan.dayKind === 'severe' && plan.band !== null ? (
          <Bulletin band={plan.band} basis={airBasis} air={day.air} />
        ) : null}
        <PlanHead response={day.response} air={day.air} household={day.household} />
        {day.local ? <LocalNote /> : <ModelNote response={day.response} again={day.again} />}
        {online ? null : <p className="small">{PLAN.offline}</p>}
        <ForecastStrip plan={plan} basis={airBasis} whatIf={whatIf} />
        <PlanSlots plan={plan} household={day.household} whatIf={whatIf} />
        <Reckoning plan={plan} />
        {day.local ? (
          <AskOff />
        ) : (
          <AskBox household={day.household} location={day.location} language={plan.language} />
        )}
      </div>
      <Account household={day.household} air={day.airQuery} basis={airBasis} />
    </div>
  );
}

/** The plan view, in whichever state it is in. */
export function PlanView(): ReactElement {
  const day = useDayPlan();
  return day.status === 'ready' ? <PlanReady day={day} /> : <NotReady day={day} title={PLAN.title} />;
}
