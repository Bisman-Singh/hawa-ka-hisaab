// The model note with its choice: use the model, or keep it off for this browser. The choice is kept with the
// household, so it is asked once, before anything first goes to the model on any path.
import type { ReactElement } from 'react';
import { Button } from '../components/Button.js';
import { ViewLink } from '../components/Navigation.js';
import { Section } from '../components/Section.js';
import type { ModelChoiceValue } from '../storage.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { CONSENT } from './words.js';

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

/** A model choice that is made: on or off. */
type Choice = Exclude<ModelChoiceValue, null>;

/** Props of a choice button. label defaults to "Turn the model on" or off; strong draws the main button. */
export interface ChoiceButtonProps {
  readonly choice: Choice;
  readonly label?: string;
  readonly strong?: boolean;
  readonly onChoose?: ((choice: Choice) => void) | undefined;
}

/** A button that keeps a model choice for this browser. */
export function ChoiceButton({ choice, label, strong = false, onChoose }: ChoiceButtonProps): ReactElement {
  const { save } = useAppActions();
  const choose = (): void => {
    save({ modelChoice: choice });
    onChoose?.(choice);
  };
  return (
    <Button look={strong ? 'main' : 'quiet'} onClick={choose}>
      {label ?? (choice === 'on' ? CONSENT.turnOn : CONSENT.turnOff)}
    </Button>
  );
}

/** The choice as it stands for this browser, with the button that changes it. */
export function ModelSwitch(): ReactElement {
  const { modelChoice } = useAppState();
  return (
    <>
      <p>{modelChoice === null ? CONSENT.notChosen : CONSENT.state[modelChoice]}</p>
      <ChoiceButton choice={modelChoice === 'on' ? 'off' : 'on'} />
    </>
  );
}

/** Props of the choice: what happens with the model off, and what to do once the choice is kept. */
export interface ModelChoiceProps {
  readonly without: string;
  readonly onChoose?: (choice: Choice) => void;
}

/** The note, what the app does without the model, and the two buttons that keep the choice. */
export function ModelChoice({ without, onChoose }: ModelChoiceProps): ReactElement {
  return (
    <Section title={CONSENT.title}>
      <ModelNote />
      <p>{without}</p>
      <div className="actions">
        <ChoiceButton choice="on" label={CONSENT.use} strong onChoose={onChoose} />
        <ChoiceButton choice="off" label={CONSENT.off} onChoose={onChoose} />
      </div>
    </Section>
  );
}
