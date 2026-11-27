// An answer under the plan: the model's answer with its stamp, the sources of the facts it cites and visible
// calculator calls, or the fixed reply for a medical question, marked as written in advance and never sent.
import type { ReactElement } from 'react';
import type { AskResponse } from '../../features/assistant/types.js';
import type { Trace } from '../../lib/types.js';
import { Disclosure } from '../components/Disclosure.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { langOf } from '../i18n/lang.js';
import { PLAN } from '../plan/strings.js';
import { HowMade } from '../trace/HowMade.js';
import { fallbackText } from '../trace/strings.js';
import { CallLine } from '../trace/TraceSections.js';
import { SourceItems } from '../trace/Working.js';
import { ASK } from './strings.js';

const paragraphs = (text: string): string[] => text.split(/\n+/).filter((part) => part.trim() !== '');

/** The sources of the facts an answer cites, each once and in English, or nothing when it cites none. */
export function Cited({
  ids,
  title,
}: {
  readonly ids: readonly string[];
  readonly title: string;
}): ReactElement | null {
  return ids.length === 0 ? null : (
    <div lang="en">
      <p className="cite">{title}</p>
      <ul className="cite">
        <SourceItems ids={ids} />
      </ul>
    </div>
  );
}

/** The fixed reply for a question about symptoms, medicines or diagnosis, with the sources of its advice. */
export function FixedReply({ answer }: { readonly answer: AskResponse }): ReactElement {
  return (
    <>
      <div className="fixed-reply">
        <p>
          <WrittenBy producedBy="fixed_reply" />
        </p>
        <div {...langOf(answer.language)}>
          {paragraphs(answer.text).map((part, index) => (
            <p key={index}>{part}</p>
          ))}
        </div>
        <Cited ids={answer.factIds} title={ASK.sources} />
      </div>
      <p className="small">{ASK.notSent}</p>
    </>
  );
}

/** How the words were made: worked out in code, refused by a check, or fixed text because the model did not answer. */
function pathNote(trace: Trace): string {
  const reason = trace.fallbackReason;
  if (reason === null) {
    return PLAN.workedOut;
  }
  const why = fallbackText(trace, reason);
  return trace.refusedBy === undefined ? `${ASK.rulesNote} ${why}` : why;
}

/** The model's answer, or the rules reply when none is shown, with the stamp, its sources and every call. */
export function ModelAnswer({ answer }: { readonly answer: AskResponse }): ReactElement {
  const { trace } = answer;
  return (
    <>
      <div {...langOf(answer.language)}>
        {paragraphs(answer.text).map((part, index) => (
          <p key={index}>{part}</p>
        ))}
      </div>
      <Cited ids={answer.factIds} title={ASK.answerSources} />
      <div className="path">
        <WrittenBy producedBy={trace.producedBy} />
        <span>{pathNote(trace)}</span>
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
