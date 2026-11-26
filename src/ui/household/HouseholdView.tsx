// The household view: the typed text beside the form the model read from it, with what it could not place and
// what it assumed; or, with no text, samples to start from. The form works the same either way.
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { SAMPLE_HOUSEHOLDS } from '../../features/household/samples.js';
import type { Household } from '../../features/household/types.js';
import { ViewHeading } from '../components/Navigation.js';
import { StateMessage } from '../components/StateMessage.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { UndoLine } from './rows.js';
import { emptyDraft, toDraft } from './draft.js';
import type { Draft } from './draft.js';
import { HouseholdForm } from './HouseholdForm.js';
import { markIntakeUsed, useIntakeEntry } from './intake-store.js';
import type { IntakeEntry } from './intake-store.js';
import { HOUSEHOLD, MODEL_DOWN } from './strings.js';
import { useHouseholdForm } from './useHouseholdForm.js';
import type { HouseholdFormState } from './useHouseholdForm.js';

function startFrom(entry: IntakeEntry | null, saved: Household | null): Draft {
  if (entry?.response.outcome === 'parsed' && !entry.used) {
    return toDraft(entry.response.household);
  }
  return saved === null ? emptyDraft() : toDraft(saved);
}

function Notes({ title, note, items }: { title: string; note: string; items: readonly string[] }) {
  const id = useId();
  return items.length === 0 ? null : (
    <section className="unplaced" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <p className="small">{note}</p>
      <ul>
        {items.map((item, index) => (
          <li key={`${String(index)}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AsRead({ entry }: { readonly entry: IntakeEntry }): ReactElement {
  const id = useId();
  const { response } = entry;
  return (
    <>
      {response.outcome === 'parsed' ? (
        <p className="lede">{HOUSEHOLD.readLede}</p>
      ) : (
        <StateMessage tone="status" glyph="model" title={HOUSEHOLD.downTitle} quiet>
          <p>
            {MODEL_DOWN[response.reason]} {HOUSEHOLD.downNext}
          </p>
        </StateMessage>
      )}
      <section className="sec" aria-labelledby={id}>
        <h2 id={id}>{HOUSEHOLD.wrote}</h2>
        <blockquote className="typed">
          <p>{entry.text}</p>
        </blockquote>
      </section>
      {response.outcome === 'parsed' ? (
        <>
          <Notes title={HOUSEHOLD.unplaced} note={HOUSEHOLD.unplacedNote} items={response.unplaced} />
          <Notes title={HOUSEHOLD.assumed} note={HOUSEHOLD.assumedNote} items={response.assumed} />
        </>
      ) : null}
      <p className="small">{HOUSEHOLD.usesForm}</p>
    </>
  );
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
      </div>
      <div className="page-right">
        <HouseholdForm form={form} kept={kept} fromText={entry !== null} />
      </div>
    </div>
  );
}
