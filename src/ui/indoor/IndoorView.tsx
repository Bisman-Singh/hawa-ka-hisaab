// Indoor air and swaps: purifier sizing as a sum, the ventilation window, source steps, mask guidance and the
// corrections of common claims, beside "instead of, do" pairs. A step or swap with no cited figure says so.
import type { ReactElement } from 'react';
import type { IndoorStep } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { NotReady } from '../plan/states.js';
import { useDayPlan } from '../plan/useDayPlan.js';
import { Section } from '../components/Section.js';
import { Note, PurifierStep, Swap } from './IndoorParts.js';
import { INDOOR } from './words.js';

/** Which part of the view each kind of indoor step belongs to. */
const STEP_PART: Readonly<Record<IndoorStep['topic'], 'purifier' | 'home' | 'claims'>> = {
  purifier: 'purifier',
  ventilation: 'home',
  source_control: 'home',
  wet_mopping: 'home',
  mask: 'home',
  myth: 'claims',
};

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
        <Section title={INDOOR.atHome}>
          <Notes steps={part('home')} language={language} />
        </Section>
        <Section title={INDOOR.claims}>
          <Notes steps={part('claims')} language={language} />
        </Section>
      </div>
      <div className="page-right">
        <Section title={INDOOR.swaps}>
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
        </Section>
      </div>
    </div>
  );
}
