// The parts of the "how this was made" sheet, built from the trace of an answer: who wrote it and whether it was
// reused, the number check, the facts sent, the model's raw reply as plain text and the calculator calls.
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ToolCallRecord, Trace } from '../../lib/types.js';
import { Disclosure } from '../components/Disclosure.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { CALL_FAILURE, CHECK, FALLBACK, MADE_BY, TRACE } from './strings.js';

function Part({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactElement {
  const id = useId();
  return (
    <section className="sec" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

/** One calculator call: its name, the arguments it was given and what it returned or why it failed. */
export function CallLine({ call }: { readonly call: ToolCallRecord }): ReactElement {
  return (
    <li>
      <span className="call">{call.name}</span>
      <code>{`${call.name}(${JSON.stringify(call.args)})`}</code>
      <span className="result">
        {call.failure === null ? JSON.stringify(call.result) : CALL_FAILURE[call.failure]}
      </span>
    </li>
  );
}

function FactsTable({ trace }: { readonly trace: Trace }): ReactElement {
  if (trace.factsSent.length === 0) {
    return <p>{TRACE.noFacts}</p>;
  }
  return (
    <table className="facts">
      <caption className="vh">{TRACE.factsCaption}</caption>
      <thead>
        <tr>
          <th scope="col">{TRACE.factsHead.label}</th>
          <th scope="col">{TRACE.factsHead.value}</th>
          <th scope="col">{TRACE.factsHead.id}</th>
        </tr>
      </thead>
      <tbody>
        {trace.factsSent.map((fact, index) => (
          <tr key={index}>
            <td>{fact.label}</td>
            <td className="num">{`${String(fact.value)} ${fact.unit}`}</td>
            <td>{fact.id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The model's reply. A reply the checks refused is never shown as an answer: it is titled as refused, says why, and
 * sits closed behind its own disclosure. An absent or masked reply is just text, so neither can break the sheet.
 */
export function Reply({ trace }: { readonly trace: Trace }): ReactElement {
  const refused = trace.producedBy === 'rules' && trace.modelReply !== null;
  const reason = trace.fallbackReason;
  return (
    <Part title={refused ? TRACE.refused : TRACE.reply}>
      {trace.modelReply === null ? <p>{TRACE.noReply}</p> : null}
      {refused ? (
        <>
          <p className="check">{`${TRACE.refusedWhy} ${reason === null ? '' : FALLBACK[reason]}`}</p>
          <Disclosure summary={TRACE.refusedShow}>
            <pre className="raw">{trace.modelReply}</pre>
          </Disclosure>
        </>
      ) : null}
      {trace.modelReply !== null && !refused ? <pre className="raw">{trace.modelReply}</pre> : null}
      <p className="small">{TRACE.replyNote}</p>
    </Part>
  );
}

/** Every part of the sheet for one trace. The raw reply sits in a pre element as text. */
export function TraceSections({ trace }: { readonly trace: Trace }): ReactElement {
  const { numberCheck } = trace;
  return (
    <>
      <Part title={TRACE.who}>
        <p>
          <WrittenBy producedBy={trace.producedBy} />
          {trace.modelId === null ? null : <span className="small"> {trace.modelId}</span>}
        </p>
        <p>{MADE_BY[trace.producedBy]}</p>
        {trace.cached === true ? <p>{TRACE.cached}</p> : null}
        {trace.fallbackReason === null ? null : <p>{FALLBACK[trace.fallbackReason]}</p>}
      </Part>
      <Part title={TRACE.check}>
        <p className="check">{CHECK[numberCheck.status]}</p>
        {numberCheck.unmatched.length === 0 ? null : (
          <p>{`${TRACE.unmatched} ${numberCheck.unmatched.join(', ')}`}</p>
        )}
        <p className="small">{TRACE.checkNote}</p>
      </Part>
      <Part title={TRACE.facts}>
        <FactsTable trace={trace} />
      </Part>
      <Reply trace={trace} />
      <Part title={TRACE.calls}>
        {trace.toolCalls.length === 0 ? (
          <p>{TRACE.noCalls}</p>
        ) : (
          <ol className="trace">
            {trace.toolCalls.map((call, index) => (
              <CallLine key={index} call={call} />
            ))}
          </ol>
        )}
      </Part>
    </>
  );
}
