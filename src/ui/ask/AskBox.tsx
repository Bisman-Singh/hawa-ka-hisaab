// The question box under the plan: a question about today goes to the ask route with the household, and the
// answer, a failure with a retry, or the waiting line shows below it.
import { type ReactElement, type SubmitEvent, useId, useState } from 'react';
import { MAX_QUESTION_CHARS } from '../../config/limits.js';
import type { Location } from '../../features/air/types.js';
import type { AskResponse } from '../../features/assistant/types.js';
import type { Household } from '../../features/household/types.js';
import type { Language } from '../../lib/types.js';
import { Field } from '../components/Field.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { Section } from '../components/Section.js';
import { useAsk } from '../data/plan-api.js';
import type { RequestState } from '../data/request.js';
import { ChoiceButton } from '../consent/ModelChoice.js';
import { CONSENT } from '../consent/words.js';
import { useAnnounce } from '../hooks/announcer.js';
import { useFocusLater } from '../hooks/focus.js';
import { FixedReply, ModelAnswer } from './Answer.js';
import { ASK } from './words.js';
import { calling, texting } from '../handlers.js';

/** Props of the ask box: what the question is about. */
export interface AskBoxProps {
  readonly household: Household;
  readonly location: Location;
  readonly language: Language;
}

/** The answer state: working, failed with a retry, or the question asked with its answer. */
export function AskResult({
  state,
  asked,
  retry,
}: {
  readonly state: RequestState<AskResponse>;
  readonly asked: string;
  readonly retry: () => void;
}): ReactElement | null {
  if (state.status === 'failed') {
    return <RequestFailure failure={state.failure} retry={retry} />;
  }
  return state.status === 'idle' || state.status === 'loading' ? null : (
    <article className="qa" aria-label={ASK.asked}>
      <p className="q">
        <span>{ASK.asked}</span>
        {asked}
      </p>
      {state.data.kind === 'medical_reply' ? (
        <FixedReply answer={state.data} />
      ) : (
        <ModelAnswer answer={state.data} />
      )}
    </article>
  );
}

/** Where the ask box goes when the model is off for this browser: why there is none, and how to turn it on. */
export function AskOff(): ReactElement {
  return (
    <Section title={ASK.title} className="ask">
      <p>{CONSENT.offAsk}</p>
      <ChoiceButton choice="on" />
    </Section>
  );
}

/** The ask box. An empty question is refused in place; the answer is announced when it arrives. */
export function AskBox({ household, location, language }: AskBoxProps): ReactElement {
  const announce = useAnnounce();
  const ask = useAsk(calling(announce, ASK.ready));
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [empty, setEmpty] = useState(false);
  const id = useId();
  const focusLater = useFocusLater();
  const busy = ask.state.status === 'loading';
  const send = (event: SubmitEvent): void => {
    event.preventDefault();
    const text = question.trim();
    setEmpty(text === '');
    if (text === '') {
      focusLater(id);
    } else if (!busy) {
      setAsked(text);
      ask.run({ question: text, household, location, language });
    }
  };
  return (
    <Section title={ASK.title} className="ask">
      <form onSubmit={send} noValidate>
        <Field id={id} label={ASK.label} hint={ASK.hint} {...(empty ? { error: ASK.empty } : {})}>
          {(control) => (
            <textarea
              {...control}
              rows={3}
              maxLength={MAX_QUESTION_CHARS}
              value={question}
              onChange={texting(setQuestion)}
            />
          )}
        </Field>
        <button className="btn" type="submit" aria-disabled={busy}>
          {ASK.send}
        </button>
      </form>
      <div role="status">{busy ? <p className="status">{ASK.working}</p> : null}</div>
      <AskResult state={ask.state} asked={asked} retry={ask.retry} />
    </Section>
  );
}
