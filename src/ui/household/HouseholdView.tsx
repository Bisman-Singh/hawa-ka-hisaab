// The household view: the typed text beside the form the model read from it, or samples to start from, the form
// that works the same either way, and the control that clears what this browser keeps.
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { SAMPLE_HOUSEHOLDS } from '../../features/household/samples.js';
import type { Household } from '../../features/household/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { ClearHousehold } from '../legal/ClearHousehold.js';
import { Part } from '../legal/parts.js';
import { PRIVACY } from '../legal/strings.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { UndoLine } from './rows.js';
import { emptyDraft, toDraft } from './draft.js';
import type { Draft } from './draft.js';
import { HouseholdForm } from './HouseholdForm.js';
import { markIntakeUsed, useIntakeEntry } from './intake-store.js';
import type { IntakeEntry } from './intake-store.js';
import { AsRead } from './AsRead.js';
import { HOUSEHOLD } from './strings.js';
import { useHouseholdForm } from './useHouseholdForm.js';
import type { HouseholdFormState } from './useHouseholdForm.js';

function startFrom(entry: IntakeEntry | null, saved: Household | null): Draft {
  if (entry?.response.outcome === 'parsed' && !entry.used) {
    return toDraft(entry.response.household);
  }
  return saved === null ? emptyDraft() : toDraft(saved);
}

function Samples({ form }: { readonly form: HouseholdFormState }): ReactElement {
  const id = useId();
  const take = (household: Household): void => {
    const back = form.at('members', 0, 'ageGroup').id;
    form.remove({ block: 'sample', said: HOUSEHOLD.sampleLoaded, next: toDraft(household), back });
  };
  return (
    <>
      <p className="lede">{HOUSEHOLD.handLede}</p>
      <h2 className="label" id={id}>
        {HOUSEHOLD.startFrom}
      </h2>
      <ul className="samples" aria-labelledby={id}>
        {SAMPLE_HOUSEHOLDS.map((sample) => (
          <li key={sample.id}>
            <q id={`${id}-${sample.id}`}>{sample.description}</q>
            <button
              className="btn btn-quiet"
              type="button"
              aria-describedby={`${id}-${sample.id}`}
              onClick={() => {
                take(sample.household);
              }}
            >
              {HOUSEHOLD.useSample}
            </button>
          </li>
        ))}
      </ul>
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
        <Part title={PRIVACY.clear}>
          <ClearHousehold id={clearId} />
        </Part>
      </div>
      <div className="page-right">
        <HouseholdForm form={form} kept={kept} fromText={entry !== null} />
      </div>
    </div>
  );
}
