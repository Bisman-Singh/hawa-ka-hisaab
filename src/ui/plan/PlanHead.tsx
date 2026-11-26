// The top of the plan: the bulletin on a severe day, the title, who and where it is for on what air, the
// headline, the written-by stamp with the number check, the plan language and the note when the model is down.
import type { ReactElement } from 'react';
import type { Household } from '../../features/household/types.js';
import type { PlanResponse } from '../../features/planner/types.js';
import type { Language } from '../../lib/types.js';
import { BandLabel } from '../components/Band.js';
import { ViewHeading } from '../components/Navigation.js';
import { Segmented } from '../components/Segmented.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { langOf } from '../i18n/lang.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { HowMade } from '../trace/HowMade.js';
import { AirBasisLine, type AirBasisLineProps } from './air-basis.js';
import { PLAN } from './strings.js';

/** Props of the plan head: the response, the air held on this page and the household the plan is for. */
export interface PlanHeadProps {
  readonly response: PlanResponse;
  readonly air: AirBasisLineProps['air'];
  readonly household: Household;
}

function ForLine({ response, air, household }: PlanHeadProps): ReactElement {
  const { place } = useAppState();
  const people = household.members.length;
  const band = response.airBasis.band;
  const where = place === null ? '' : ` ${PLAN.in} ${place.label ?? place.name}`;
  return (
    <p className="for">
      {`${PLAN.for} ${String(people)}${where}`}
      {band === null ? (
        `. ${PLAN.unknownDay}`
      ) : (
        <>
          , {PLAN.onA} <BandLabel band={band} /> {PLAN.day}
        </>
      )}{' '}
      {response.plan.dayKind === 'severe' ? null : <AirBasisLine basis={response.airBasis} air={air} />}
    </p>
  );
}

const LANGUAGES = [
  { value: 'en', label: PLAN.english },
  { value: 'hi', label: PLAN.hindi, lang: 'hi' },
] satisfies { value: Language; label: string; lang?: Language }[];

/** The language switch. A new language drops the plan, so the next one is made in it. */
export function LanguageSwitch({ planLanguage }: { readonly planLanguage: Language }): ReactElement {
  const { language } = useAppState();
  const { save } = useAppActions();
  return (
    <div className="plan-tools">
      <Segmented
        legend={PLAN.language}
        options={LANGUAGES}
        value={language}
        onChange={(next) => {
          save({ language: next });
        }}
      />
      {language === planLanguage ? null : <p className="small">{PLAN.hindiNeedsModel}</p>}
    </div>
  );
}

/** The head of the plan with its title, basis, headline, stamp and tools. */
export function PlanHead({ response, air, household }: PlanHeadProps): ReactElement {
  const { plan, trace } = response;
  return (
    <header className="plan-head">
      <ViewHeading>{PLAN.title}</ViewHeading>
      <ForLine response={response} air={air} household={household} />
      <p className="lede" {...langOf(plan.language)}>
        {plan.headline}
      </p>
      <div className="path">
        <WrittenBy producedBy={trace.producedBy} />
        <span>{trace.numberCheck.status === 'passed' ? PLAN.checked : PLAN.workedOut}</span>
        <HowMade trace={trace} />
      </div>
      <LanguageSwitch planLanguage={plan.language} />
    </header>
  );
}
