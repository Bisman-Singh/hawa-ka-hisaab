// The model note with its choice: use the model, or keep it off for this browser. The choice is kept with the
// household, so it is asked once, before anything first goes to the model on any path.
import { useId } from 'react';
import type { ReactElement } from 'react';
import { ViewLink } from '../components/Navigation.js';
import type { ModelChoiceValue } from '../storage.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { CONSENT } from './strings.js';

/**
 * The note itself: what is sent, the free tier terms, what not to add and what is kept, with the privacy link. lead
 * opens it in bold where no heading names it, as above the intake's send button.
 */
export function ModelNote({ id, lead }: { readonly id?: string; readonly lead?: string }): ReactElement {
  return (
    <div className="privacy-note" id={id}>
      <p>
        {lead === undefined ? null : <b>{lead} </b>}
        {CONSENT.sent}
      </p>
      <p>{CONSENT.terms}</p>
      <p>
        <b>{CONSENT.ask}</b>
      </p>
      <p>
        {CONSENT.kept} <ViewLink to="privacy">{CONSENT.more}</ViewLink>.
      </p>
    </div>
  );
}

/** The choice as it stands for this browser, with the button that changes it. */
export function ModelSwitch(): ReactElement {
  const { modelChoice } = useAppState();
  const { save } = useAppActions();
  const next = modelChoice === 'on' ? 'off' : 'on';
  return (
    <>
      <p>{modelChoice === null ? CONSENT.notChosen : CONSENT.state[modelChoice]}</p>
      <button
        className="btn btn-quiet"
        type="button"
        onClick={() => {
          save({ modelChoice: next });
        }}
      >
        {next === 'on' ? CONSENT.turnOn : CONSENT.turnOff}
      </button>
    </>
  );
}

/** Props of the choice: what happens with the model off, and what to do once the choice is kept. */
export interface ModelChoiceProps {
  readonly without: string;
  readonly onChoose?: (choice: Exclude<ModelChoiceValue, null>) => void;
}

/** The note, what the app does without the model, and the two buttons that keep the choice. */
export function ModelChoice({ without, onChoose }: ModelChoiceProps): ReactElement {
  const id = useId();
  const { save } = useAppActions();
  const choose = (choice: Exclude<ModelChoiceValue, null>): void => {
    save({ modelChoice: choice });
    onChoose?.(choice);
  };
  return (
    <section className="sec" aria-labelledby={id}>
      <h2 id={id}>{CONSENT.title}</h2>
      <ModelNote />
      <p>{without}</p>
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            choose('on');
          }}
        >
          {CONSENT.use}
        </button>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => {
            choose('off');
          }}
        >
          {CONSENT.off}
        </button>
      </div>
    </section>
  );
}
