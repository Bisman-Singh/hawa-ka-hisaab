// The household view: the typed text beside the form the model read from it, or samples to start from, the form
// that works the same either way, and the control that clears what this browser keeps.
import { type ReactElement, useId, useState } from 'react';
import type { SampleHousehold } from '../../features/household/samples.js';
import type { Household } from '../../features/household/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { ClearHousehold } from '../legal/ClearHousehold.js';
import { Section } from '../components/Section.js';
import { PRIVACY } from '../legal/words.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { UndoLine } from './rows.js';
import { type Draft, emptyDraft, toDraft } from './draft.js';
import { HouseholdForm } from './HouseholdForm.js';
import { type IntakeEntry, markIntakeUsed, useIntakeEntry } from './intake-store.js';
import { AsRead } from './AsRead.js';
import { SampleList } from './intake-parts.js';
import { HOUSEHOLD } from './words.js';
import { type HouseholdFormState, useHouseholdForm } from './useHouseholdForm.js';

function startFrom(entry: IntakeEntry | null, saved: Household | null): Draft {
  if (entry?.response.outcome === 'parsed' && !entry.used) {
    return toDraft(entry.response.household);
  }
  return saved === null ? emptyDraft() : toDraft(saved);
}

function Samples({ form }: { readonly form: HouseholdFormState }): ReactElement {
  const take = ({ household }: SampleHousehold): void => {
    const back = form.at('members', 0, 'ageGroup').id;
    form.remove({ block: 'sample', said: HOUSEHOLD.sampleLoaded, next: toDraft(household), back });
  };
  return (
    <>
      <p className="lede">{HOUSEHOLD.handLede}</p>
      <SampleList title={HOUSEHOLD.startFrom} heading="h2" use={HOUSEHOLD.useSample} onUse={take} />
      <UndoLine form={form} block="sample" />
    </>
  );
}

/** The household view, loaded on demand. Saving keeps the household in this browser and offers today's plan. */
export function HouseholdView(): ReactElement {
  const entry = useIntakeEntry();
  const clearId = useId();
  const { household, kept } = useAppState();
  const { save } = useAppActions();
  const [initial] = useState(() => startFrom(entry, household));
  const form = useHouseholdForm(initial, (next) => {
    save({ household: next });
    markIntakeUsed();
  });
  return (
    <div className="spread">
      <div className="page-left">
        <ViewHeading>{HOUSEHOLD.title}</ViewHeading>
        {entry === null ? <Samples form={form} /> : <AsRead entry={entry} />}
        <Section title={PRIVACY.clear}>
          <ClearHousehold id={clearId} />
        </Section>
      </div>
      <div className="page-right">
        <HouseholdForm form={form} kept={kept} fromText={entry !== null} />
      </div>
    </div>
  );
}
