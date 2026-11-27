// Indoor air and swaps: purifier sizing as a sum, the ventilation window, source steps, mask guidance and the
// corrections of common claims, beside "instead of, do" pairs. A step or swap with no cited figure says so.
import type { ReactElement } from 'react';
import type { IndoorStep } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { NotReady } from '../plan/states.js';
import { useDayPlan } from '../plan/useDayPlan.js';
import { Note, Part, PurifierStep, Swap } from './IndoorParts.js';
import { INDOOR, STEP_PART } from './strings.js';

function Notes({ steps, language }: { readonly steps: readonly IndoorStep[]; readonly language: Language }) {
  return steps.length === 0 ? (
    <p className="small">{INDOOR.noSteps}</p>
  ) : (
    <ul className="notes">
      {steps.map((step) => (
        <Note key={step.id} step={step} language={language} />
      ))}
    </ul>
  );
}

/** The indoor view, in whichever state the plan is in. */
export function IndoorView(): ReactElement {
  const day = useDayPlan();
  if (day.status !== 'ready') {
    return <NotReady day={day} title={INDOOR.title} />;
  }
  const { indoor, alternatives, language } = day.response.plan;
  const part = (name: string): IndoorStep[] => indoor.filter((step) => STEP_PART[step.topic] === name);
  return (
    <div className="spread even">
      <div className="page-left">
        <ViewHeading>{INDOOR.title}</ViewHeading>
        <p className="lede">{INDOOR.lede}</p>
        {part('purifier').map((step) => (
          <PurifierStep key={step.id} step={step} language={language} />
        ))}
        <Part title={INDOOR.atHome}>
          <Notes steps={part('home')} language={language} />
        </Part>
        <Part title={INDOOR.claims}>
          <Notes steps={part('claims')} language={language} />
        </Part>
      </div>
      <div className="page-right">
        <Part title={INDOOR.swaps}>
          <p className="lede">{INDOOR.swapsLede}</p>
          {alternatives.length === 0 ? (
            <p className="small">{INDOOR.noSwaps}</p>
          ) : (
            <ol className="swap">
              {alternatives.map((swap) => (
                <Swap key={swap.id} swap={swap} language={language} />
              ))}
            </ol>
          )}
        </Part>
      </div>
    </div>
  );
}
