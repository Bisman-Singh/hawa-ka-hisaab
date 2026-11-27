// The parts of the "how this was made" sheet from an answer's trace: who wrote it and whether it was reused, the
// number check, the facts sent, the reply used as plain text or why one was refused, and the calculator calls.
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { GuardCheck, ToolCallRecord, Trace } from '../../lib/types.js';
import { WrittenBy } from '../components/WrittenBy.js';
import { FactsTable } from './FactsTable.js';
import { CALL_FAILURE, CHECK, FALLBACK, MADE_BY, refusalText, TRACE } from './strings.js';

/** Reasons the model was never asked, so the facts made for it were not sent. */
const NOT_ASKED: ReadonlySet<Trace['fallbackReason']> = new Set(['disabled', 'rate_limited', 'daily_cap']);

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

function Refusal({ check, trace }: { readonly check: GuardCheck; readonly trace: Trace }): ReactElement {
  const { unmatched } = trace.numberCheck;
  return (
    <>
      <p className="check">{refusalText(check)}</p>
      {check === 'numbers' && unmatched.length > 0 ? (
        <p>{`${TRACE.unmatched} ${unmatched.join(', ')}`}</p>
      ) : null}
      <p className="small">{TRACE.refusedNote}</p>
    </>
  );
}

/**
 * The model's reply. Only a reply the app used is shown, as plain text. A reply a check refused is never kept: the
 * part says so, names the check, and for the number check lists the numbers that matched nothing.
 */
export function Reply({ trace }: { readonly trace: Trace }): ReactElement {
  const check = trace.refusedBy;
  const shown = trace.producedBy === 'model' ? trace.modelReply : null;
  return (
    <Part title={check === undefined ? TRACE.reply : TRACE.refused}>
      {check === undefined ? null : <Refusal check={check} trace={trace} />}
      {shown === null && check === undefined ? <p>{TRACE.noReply}</p> : null}
      {shown === null ? null : <pre className="raw">{shown}</pre>}
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
        {trace.fallbackReason === null || trace.refusedBy !== undefined ? null : (
          <p>{FALLBACK[trace.fallbackReason]}</p>
        )}
      </Part>
      <Part title={TRACE.check}>
        <p className="check">{CHECK[numberCheck.status]}</p>
        {numberCheck.unmatched.length === 0 ? null : (
          <p>{`${TRACE.unmatched} ${numberCheck.unmatched.join(', ')}`}</p>
        )}
        <p className="small">{TRACE.checkNote}</p>
      </Part>
      <Part title={NOT_ASKED.has(trace.fallbackReason) ? TRACE.factsNotSent : TRACE.facts}>
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
