// The household intake on the first screen: the text box, samples, the model note before sending, and each outcome.
// Reading with the model keeps that choice; with the model off the box points to the hand form, never an error.
import { useId, useRef, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { MAX_INTAKE_TEXT_CHARS } from '../../config/limits.js';
import { ViewLink } from '../components/Navigation.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { useIntake } from '../data/api.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useFocusLater } from '../place/focus.js';
import { CONSENT } from '../consent/strings.js';
import { ModelNote } from '../consent/ModelChoice.js';
import { useRoute } from '../router.js';
import { useAppActions, useAppState } from '../state/app-state.js';
import { IntakeSamples, IntakeText } from './intake-parts.js';
import { setIntake } from './intake-store.js';
import { INTAKE } from './strings.js';

const problemOf = (text: string): string | null => {
  if (text.trim() === '') {
    return INTAKE.empty;
  }
  return text.length > MAX_INTAKE_TEXT_CHARS ? INTAKE.tooLong(text.length) : null;
};

/** The send button, or with the model off the way to turn it on, and the link to the hand form. */
export function IntakeActions({
  busy,
  off,
}: {
  readonly busy: boolean;
  readonly off: boolean;
}): ReactElement {
  const { save } = useAppActions();
  return (
    <>
      {off ? <p>{CONSENT.offIntake}</p> : null}
      <div className="actions">
        {off ? (
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => {
              save({ modelChoice: 'on' });
            }}
          >
            {CONSENT.turnOn}
          </button>
        ) : (
          <button className="btn" type="submit" aria-disabled={busy}>
            {INTAKE.read}
          </button>
        )}
        <ViewLink to="household">{INTAKE.byHand}</ViewLink>
      </div>
    </>
  );
}

/** The intake form. The text is sent only from the Read button, after the model note, which keeps the choice. */
export function IntakeBox(): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const sent = useRef('');
  const { navigate } = useRoute();
  const announce = useAnnounce();
  const focusLater = useFocusLater();
  const { modelChoice } = useAppState();
  const { save } = useAppActions();
  const intake = useIntake((response) => {
    setIntake({ text: sent.current, response });
    navigate('household');
  });
  const busy = intake.state.status === 'loading';
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const found = problemOf(text);
    setProblem(found);
    if (found !== null) {
      focusLater(`${id}-text`);
    } else if (!busy) {
      sent.current = text.trim();
      save({ modelChoice: 'on' });
      intake.run({ text: sent.current });
    }
  };
  const takeSample = (description: string): void => {
    setText(description);
    setProblem(null);
    focusLater(`${id}-text`);
    announce(INTAKE.used);
  };
  return (
    <section className="sec" aria-labelledby={`${id}-h`}>
      <form onSubmit={submit} noValidate>
        <IntakeText id={id} text={text} problem={problem} onText={setText} />
        <IntakeSamples id={id} onUse={takeSample} />
        <ModelNote id={`${id}-privacy`} lead={CONSENT.lead} />
        <div role="status">{busy ? <p className="status">{INTAKE.reading}</p> : null}</div>
        {intake.state.status === 'failed' ? (
          <RequestFailure failure={intake.state.failure} retry={intake.retry} />
        ) : null}
        <IntakeActions busy={busy} off={modelChoice === 'off'} />
      </form>
    </section>
  );
}
