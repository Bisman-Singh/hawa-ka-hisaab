// The question box under the plan: a question about today goes to the ask route with the household, and the
// answer, a failure with a retry, or the waiting line shows below it.
import { useId, useRef, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { MAX_QUESTION_CHARS } from '../../config/limits.js';
import type { Location } from '../../features/air/types.js';
import type { AskResponse } from '../../features/assistant/types.js';
import type { Household } from '../../features/household/types.js';
import type { Language } from '../../lib/types.js';
import { Field } from '../components/Field.js';
import { RequestFailure } from '../components/RequestFailure.js';
import { useAction } from '../data/request.js';
import type { RequestState } from '../data/request.js';
import { useAnnounce } from '../hooks/announcer.js';
import { askCall } from '../plan/calls.js';
import { FixedReply, ModelAnswer } from './Answer.js';
import { ASK } from './strings.js';
import { calling, texting } from '../plan/handlers.js';

/** Moves focus to an element when there is one, such as a field after a refused send. */
export function focusOn(element: HTMLElement | null): void {
  element?.focus();
}

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
  if (state.status === 'loading') {
    return (
      <p className="status" role="status">
        {ASK.working}
      </p>
    );
  }
  if (state.status === 'failed') {
    return <RequestFailure failure={state.failure} retry={retry} />;
  }
  return state.status === 'idle' ? null : (
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

/** The ask box. An empty question is refused in place; the answer is announced when it arrives. */
export function AskBox({ household, location, language }: AskBoxProps): ReactElement {
  const id = useId();
  const announce = useAnnounce();
  const ask = useAction(askCall, calling(announce, ASK.ready));
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [empty, setEmpty] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const send = (event: SubmitEvent): void => {
    event.preventDefault();
    const text = question.trim();
    setEmpty(text === '');
    if (text === '') {
      focusOn(box.current);
      return;
    }
    setAsked(text);
    ask.run({ question: text, household, location, language });
  };
  return (
    <section className="sec ask" aria-labelledby={id}>
      <h2 id={id}>{ASK.title}</h2>
      <form onSubmit={send} noValidate>
        <Field label={ASK.label} hint={ASK.hint} {...(empty ? { error: ASK.empty } : {})}>
          {(control) => (
            <textarea
              {...control}
              ref={box}
              rows={3}
              maxLength={MAX_QUESTION_CHARS}
              value={question}
              onChange={texting(setQuestion)}
            />
          )}
        </Field>
        <button className="btn" type="submit" disabled={ask.state.status === 'loading'}>
          {ASK.send}
        </button>
      </form>
      <AskResult state={ask.state} asked={asked} retry={ask.retry} />
    </section>
  );
}
