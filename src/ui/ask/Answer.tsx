// An answer under the plan: the model's answer with its stamp and visible calculator calls, or the fixed reply
// for a medical question, marked as written in advance and never sent to the model.
import type { ReactElement } from 'react';
import type { AskResponse } from '../../features/assistant/types.js';
import { Disclosure } from '../components/Disclosure.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { langOf } from '../i18n/lang.js';
import { PLAN } from '../plan/strings.js';
import { HowMade } from '../trace/HowMade.js';
import { FALLBACK } from '../trace/strings.js';
import { CallLine } from '../trace/TraceSections.js';
import { factsFor, SourceLine } from '../trace/Working.js';
import { ASK } from './strings.js';

const paragraphs = (text: string): string[] => text.split(/\n+/).filter((part) => part.trim() !== '');

/** The fixed reply for a question about symptoms, medicines or diagnosis, with the sources of its advice. */
export function FixedReply({ answer }: { readonly answer: AskResponse }): ReactElement {
  return (
    <>
      <div className="fixed-reply" {...langOf(answer.language)}>
        <p>
          <WrittenBy producedBy="fixed_reply" />
        </p>
        {paragraphs(answer.text).map((part, index) => (
          <p key={index}>{part}</p>
        ))}
        <p className="cite">{ASK.sources}</p>
        <ul className="cite">
          {factsFor(answer.factIds).map((fact) => (
            <SourceLine key={typeof fact === 'string' ? fact : fact.id} fact={fact} />
          ))}
        </ul>
      </div>
      <p className="small">{ASK.notSent}</p>
    </>
  );
}

/** The model's answer, or the rules reply when it did not answer, with the stamp and every calculator call. */
export function ModelAnswer({ answer }: { readonly answer: AskResponse }): ReactElement {
  const { trace } = answer;
  const reason = trace.fallbackReason;
  return (
    <>
      <div {...langOf(answer.language)}>
        {paragraphs(answer.text).map((part, index) => (
          <p key={index}>{part}</p>
        ))}
      </div>
      <div className="path">
        <WrittenBy producedBy={trace.producedBy} />
        <span>{reason === null ? PLAN.workedOut : `${ASK.rulesNote} ${FALLBACK[reason]}`}</span>
        <HowMade trace={trace} />
      </div>
      {trace.toolCalls.length === 0 ? (
        <p className="small">{ASK.noCalls}</p>
      ) : (
        <Disclosure summary={`${ASK.calls} ${String(trace.toolCalls.length)}`} open>
          <ol className="trace">
            {trace.toolCalls.map((call, index) => (
              <CallLine key={index} call={call} />
            ))}
          </ol>
        </Disclosure>
      )}
    </>
  );
}
