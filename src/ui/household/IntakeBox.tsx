// The household intake on the first screen: the text box with its limit, three samples, the privacy note before
// sending, and each outcome. A model that cannot read opens the hand form with the reason, never an error page.
import { useId, useRef, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { MAX_INTAKE_TEXT_CHARS } from '../../config/limits.js';
import { intakeRoute } from '../../features/household/contract.js';
import type { IntakeRequest, IntakeResponse } from '../../features/household/types.js';
import { postJson } from '../api-client.js';
import { ViewLink } from '../components/Navigation.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { useAction } from '../data/request.js';
import type { Call } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useFocusLater } from '../place/focus.js';
import { useRoute } from '../router.js';
import { IntakeSamples, IntakeText, PrivacyNote } from './intake-parts.js';
import { setIntake } from './intake-store.js';
import { INTAKE } from './strings.js';

const sendIntake: Call<IntakeRequest, IntakeResponse> = (body, signal) =>
  postJson(intakeRoute, body, { signal });

const problemOf = (text: string): string | null => {
  if (text.trim() === '') {
    return INTAKE.empty;
  }
  return text.length > MAX_INTAKE_TEXT_CHARS ? INTAKE.tooLong(text.length) : null;
};

/** The intake form. The text is sent only from the Read button, after the privacy note. */
export function IntakeBox(): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const sent = useRef('');
  const { navigate } = useRoute();
  const announce = useAnnounce();
  const focusLater = useFocusLater();
  const intake = useAction(sendIntake, (response) => {
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
        <PrivacyNote id={`${id}-privacy`} />
        <div role="status">{busy ? <p className="status">{INTAKE.reading}</p> : null}</div>
        {intake.state.status === 'failed' ? (
          <RequestFailure failure={intake.state.failure} retry={intake.retry} />
        ) : null}
        <div className="actions">
          <button className="btn" type="submit" aria-disabled={busy}>
            {INTAKE.read}
          </button>
          <ViewLink to="household">{INTAKE.byHand}</ViewLink>
        </div>
      </form>
    </section>
  );
}
